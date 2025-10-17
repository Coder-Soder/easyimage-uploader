const { Plugin, Notice, Setting, TFile, requestUrl } = require('obsidian');

module.exports = class EasyImageUploader extends Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.app = app;
        this.manifest = manifest;
    }

    async onload() {
        console.log('加载 EasyImage Uploader 插件');
        
        await this.loadSettings();
        this.apiClient = new EasyImageApiClient(this.settings);
        
        this.addCommand({
            id: 'upload-all-images',
            name: '上传所有图片到EasyImage',
            editorCallback: (editor, view) => {
                this.uploadAllImages(editor, view);
            }
        });
        
        this.addCommand({
            id: 'upload-selected-image',
            name: '上传选中图片到EasyImage',
            editorCallback: (editor, view) => {
                this.uploadSelectedImage(editor, view);
            }
        });
        
        this.addSettingTab(new EasyImageSettingTab(this.app, this));
    }
    
    onunload() {
        console.log('卸载 EasyImage Uploader 插件');
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        this.apiClient = new EasyImageApiClient(this.settings);
    }
    
    addContextMenu(menu, editor, view) {
        menu.addItem((item) => {
            item.setTitle('上传图片到EasyImage')
                .setIcon('upload')
                .onClick(() => {
                    this.uploadSelectedImage(editor, view);
                });
        });
    }
    
    async uploadAllImages(editor, view) {
        try {
            new Notice('开始上传图片...');
            const content = editor.getValue();
            const processor = new ImageProcessor(this.app, this.apiClient, this.settings);
            const result = await processor.processAllImages(content);
            
            if (result.successCount > 0) {
                editor.setValue(result.content);
                new Notice(`成功上传 ${result.successCount} 张图片`);
            } else {
                new Notice('没有发现需要上传的图片');
            }
        } catch (error) {
            console.error('上传图片失败:', error);
            new Notice('上传图片失败: ' + error.message);
        }
    }
    
    async uploadSelectedImage(editor, view) {
        try {
            const selection = editor.getSelection();
            if (!selection) {
                new Notice('请先选择图片链接或Markdown图片语法');
                return;
            }
            
            const processor = new ImageProcessor(this.app, this.apiClient, this.settings);
            const imageRegex = processor.getImageRegex();
            const match = imageRegex.exec(selection);
            
            let imageUrl;
            let isMarkdownFormat = false;
            
            if (match && match[1]) {
                imageUrl = match[1];
                isMarkdownFormat = true;
            } else {
                imageUrl = selection.trim();
            }
            
            // 增强图片URL验证，支持绝对路径
            if (!imageUrl) {
                new Notice('选中的内容不是有效的图片链接');
                return;
            }
            
            const isWebImage = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
            const isLocalAbsolute = processor.isAbsolutePath(imageUrl);
            const isVaultImage = !isWebImage && !isLocalAbsolute && 
                                this.app.vault.getAbstractFileByPath(processor.resolveRelativePath(imageUrl));
            
            if (!isWebImage && !isLocalAbsolute && !isVaultImage) {
                new Notice('选中的内容不是有效的图片链接');
                return;
            }
            
            const result = await processor.processSingleImage(imageUrl);
            
            if (result.success) {
                let newContent;
                if (isMarkdownFormat) {
                    newContent = selection.replace(imageUrl, result.newUrl);
                } else {
                    newContent = result.newUrl;
                }
                editor.replaceSelection(newContent);
                new Notice('图片上传成功');
            } else {
                new Notice('图片上传失败: ' + result.error);
            }
        } catch (error) {
            console.error('上传选中图片失败:', error);
            new Notice('上传图片失败: ' + error.message);
        }
    }
}

const DEFAULT_SETTINGS = {
    apiUrl: 'https://yourdomain.com',
    token: 'your token here',
    domain: 'https://yourdomain.com for image',
    compression: 80,
    convertFormat: 'webp',
    autoUpload: true,
    maxConcurrentUploads: 3
};

class EasyImageApiClient {
    constructor(settings) {
        this.settings = settings;
    }
    
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('token', this.settings.token);
        
        try {
            const response = await fetch(this.settings.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.result === 'success') {
                return {
                    success: true,
                    url: result.url,
                    thumb: result.thumb,
                    srcName: result.srcName
                };
            } else {
                throw new Error(result.message || '上传失败');
            }
        } catch (error) {
            console.error('API调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class ImageProcessor {
    constructor(app, apiClient, settings) {
        this.app = app;
        this.apiClient = apiClient;
        this.settings = settings;
    }
    
    getImageRegex() {
        return /!\[.*?\]\((.*?)\)/g;
    }
    
    detectImages(content) {
        const regex = this.getImageRegex();
        const images = [];
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            const url = match[1];
            const type = this.classifyImage(url);
            
            images.push({
                url: url,
                type: type,
                fullMatch: match[0],
                index: match.index
            });
        }
        
        return images;
    }
    
    // 增强图片分类，支持绝对路径识别
    classifyImage(url) {
        if (url.includes(this.settings.domain)) {
            return 'easyimage';
        }
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return 'web';
        }
        
        if (this.isAbsolutePath(url)) {
            return 'local';
        }
        
        return 'local';
    }
    
    // 判断是否为绝对路径
    isAbsolutePath(path) {
        // Windows绝对路径: 带盘符或网络路径
        if (/^[A-Za-z]:[\\/]/.test(path) || /^\\\\[^\\]+[\\/]/.test(path)) {
            return true;
        }
        // 类Unix绝对路径: 以/开头
        if (path.startsWith('/')) {
            return true;
        }
        return false;
    }
    
    async processSingleImage(imageUrl) {
        const type = this.classifyImage(imageUrl);
        
        if (type === 'easyimage') {
            return {
                success: true,
                newUrl: imageUrl,
                message: '已经是EasyImage图片'
            };
        }
        
        try {
            let file;
            
            if (type === 'web') {
                file = await this.downloadWebImage(imageUrl);
            } else {
                file = await this.readLocalImage(imageUrl);
            }
            
            const uploadResult = await this.apiClient.uploadImage(file);
            
            if (uploadResult.success) {
                return {
                    success: true,
                    newUrl: uploadResult.url,
                    originalUrl: imageUrl
                };
            } else {
                return {
                    success: false,
                    error: uploadResult.error
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async processAllImages(content) {
        const images = this.detectImages(content);
        const uploadQueue = [];
        const replacements = new Map();
        
        const imagesToUpload = images.filter(img => img.type !== 'easyimage');
        
        if (imagesToUpload.length === 0) {
            new Notice('没有需要上传的图片');
            return {
                content: content,
                successCount: 0,
                totalCount: 0
            };
        }
        
        new Notice(`开始上传 ${imagesToUpload.length} 张图片...`);
        
        for (const image of imagesToUpload) {
            const task = this.processSingleImage(image.url)
                .then(result => {
                    if (result.success) {
                        replacements.set(image.fullMatch, result.newUrl);
                    } else {
                        console.error(`图片 ${image.url} 上传失败:`, result.error);
                    }
                    return result;
                })
                .catch(error => {
                    console.error(`处理图片 ${image.url} 出错:`, error);
                    return { success: false, error: error.message };
                });
            uploadQueue.push(task);
        }
        
        const results = await Promise.allSettled(uploadQueue);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        let newContent = content;
        for (const [original, newUrl] of replacements) {
            const newMarkdown = original.replace(/\((.*?)\)/, `(${newUrl})`);
            newContent = newContent.replace(original, newMarkdown);
        }
        
        new Notice(`上传完成: 成功 ${successCount}/${imagesToUpload.length} 张`);
        return {
            content: newContent,
            successCount: successCount,
            totalCount: imagesToUpload.length
        };
    }
    
    async downloadWebImage(url) {
        try {
            const response = await requestUrl({
                url: url,
                method: 'GET',
                responseType: 'arraybuffer'
            });
            
            const arrayBuffer = response.arrayBuffer;
            const blob = new Blob([arrayBuffer]);
            const filename = this.generateFilename(url);
            
            return new File([blob], filename, { 
                type: response.headers['content-type'] || 'image/*' 
            });
        } catch (error) {
            console.error('网络图片下载失败:', error);
            throw new Error(`下载网络图片失败: ${error.message}`);
        }
    }

    
    // 增强本地图片读取，支持绝对路径
    async readLocalImage(path) {
        try {
            const normalizedPath = this.normalizePath(path);
            
            // 处理绝对路径
            if (this.isAbsolutePath(normalizedPath)) {
                const fs = require('fs').promises;
                const nodePath = require('path');
                
                // 验证文件是否存在
                await fs.access(normalizedPath);
                
                // 读取文件内容
                const arrayBuffer = await fs.readFile(normalizedPath);
                const fileName = nodePath.basename(normalizedPath);
                
                return new File([arrayBuffer], fileName, { type: 'image/*' });
            } 
            // 处理相对路径
            else {
                const absolutePath = this.resolveRelativePath(normalizedPath);
                const file = this.app.vault.getAbstractFileByPath(absolutePath);
                
                if (!file) {
                    throw new Error(`文件不存在: ${path}`);
                }
                
                if (!(file instanceof TFile)) {
                    throw new Error(`路径不是文件: ${path}`);
                }
                
                const arrayBuffer = await this.app.vault.readBinary(file);
                return new File([arrayBuffer], file.name, { type: 'image/*' });
            }
        } catch (error) {
            throw new Error(`读取本地图片失败: ${error.message}`);
        }
    }
    
    resolveRelativePath(path) {
        if (path.startsWith('./') || path.startsWith('../')) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const parentDir = activeFile.parent.path;
                return this.normalizePath(parentDir + '/' + path);
            }
        }
        return path;
    }
    
    normalizePath(path) {
        return path.replace(/\\/g, '/').replace(/\/+/g, '/');
    }
    
    generateFilename(url) {
        const timestamp = Date.now();
        const extension = this.getFileExtension(url);
        return `image_${timestamp}.${extension}`;
    }
    
    getFileExtension(url) {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
        return match ? match[1] : 'jpg';
    }
}

class EasyImageSettingTab {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'EasyImage Uploader 设置' });
        
        new Setting(containerEl)
            .setName('API地址')
            .setDesc('EasyImage API接口地址')
            .addText(text => text
                .setPlaceholder('请输入API地址')
                .setValue(this.plugin.settings.apiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.apiUrl = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('API Token')
            .setDesc('EasyImage API认证Token')
            .addText(text => text
                .setPlaceholder('请输入Token')
                .setValue(this.plugin.settings.token)
                .onChange(async (value) => {
                    this.plugin.settings.token = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('图片域名')
            .setDesc('EasyImage图片访问域名')
            .addText(text => text
                .setPlaceholder('请输入图片域名')
                .setValue(this.plugin.settings.domain)
                .onChange(async (value) => {
                    this.plugin.settings.domain = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('压缩质量')
            .setDesc('图片压缩质量 (1-100)')
            .addSlider(slider => slider
                .setLimits(1, 100, 1)
                .setValue(this.plugin.settings.compression)
                .onChange(async (value) => {
                    this.plugin.settings.compression = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('自动上传')
            .setDesc('粘贴图片时自动上传到EasyImage')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoUpload)
                .onChange(async (value) => {
                    this.plugin.settings.autoUpload = value;
                    await this.plugin.saveSettings();
                }));
    }

}
