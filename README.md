# EasyImage Uploader

Obsidian 插件，一键上传图片到 EasyImage 图床，简化图片管理流程。

## 功能特点

- 一键上传文档中所有本地图片到 EasyImage 图床
- 支持上传选中的单个图片链接
- 自动识别已上传的 EasyImage 图片，避免重复上传
- 支持处理本地图片和网络图片
- 可配置的图片压缩质量
- 上传进度提示和结果反馈
- 支持自动上传粘贴的图片（可在设置中开启）

## 安装方法

1. 在 Obsidian 中打开「设置」→「社区插件」
2. 关闭「安全模式」
3. 点击「浏览社区插件」，搜索「EasyImage Uploader」
4. 点击「安装」，然后启用插件

## 使用方法

### 上传所有图片

1. 打开需要处理的文档
2. 打开命令面板（默认 `Ctrl+P` 或 `Cmd+P`）
3. 搜索并执行「EasyImage Uploader: 上传所有图片到 EasyImage」命令
4. 等待上传完成，文档中的本地图片将自动替换为图床链接

### 上传选中图片

1. 在编辑器中选中图片的 Markdown 链接（例如 `![](/path/to/image.png)`）
2. 打开命令面板并执行「EasyImage Uploader: 上传选中图片到 EasyImage」命令
3. 或右键点击选中内容，选择「上传图片到 EasyImage」
4. 选中的图片链接将被替换为图床链接

## 插件设置

在 Obsidian 设置中找到「EasyImage Uploader」设置面板，可以配置以下选项：

- **API 地址**：EasyImage 图床的 API 接口地址
- **API Token**：用于认证的 API Token
- **图片域名**：EasyImage 图片的访问域名
- **压缩质量**：图片上传时的压缩质量（1-100）
- **自动上传**：开启后，粘贴图片时将自动上传到图床

## 注意事项

- 确保 API 地址和 Token 配置正确，否则无法正常上传
- 网络图片上传功能依赖于目标服务器的访问权限
- 批量上传时会显示进度提示，大型图片可能需要较长处理时间
- 已上传到 EasyImage 的图片不会被重复上传

## 许可证

本插件采用 MIT 许可证开源，详情参见 LICENSE 文件。

## 作者信息

- 作者：Richard Yang
- 项目地址：https://github.com/Coder-Soder/easyimage-uploader
