const DEFAULT_SETTINGS = {
    apiUrl: 'https://image.thinkflow.top:16666/api/index.php',
    token: 'e45519463211461754c4514b62d69bff',
    domain: 'https://image.thinkflow.top:16666',
    compression: 80,
    convertFormat: 'webp',
    autoUpload: true,
    maxConcurrentUploads: 3
};

class EasyImageSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'EasyImage Uploader 设置' });
        
        // API地址设置
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
        
        // Token设置
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
        
        // 图片域名设置
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
        
        // 压缩质量设置
        new Setting(containerEl)
            .setName('压缩质量')
            .setDesc('图片压缩质量 (1-100)')
            .addSlider(slider => slider
                .setLimits(1, 100, 1)
                .setValue(this.plugin.settings.compression)
                .onChange(async (value) => {
                    this.plugin.settings.compression = value;
                    await this.plugin.saveSettings();
                })
                .then(slider => {
                    const valueDisplay = containerEl.createDiv({ text: `当前质量: ${this.plugin.settings.compression}` });
                    slider.sliderEl.addEventListener('input', (e) => {
                        valueDisplay.setText(`当前质量: ${e.target.value}`);
                    });
                }));
        
        // 自动上传设置
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