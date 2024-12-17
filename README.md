# Cloudflare 向量化存储 API 演示

这是一个基于 Hono 框架的 Cloudflare Workers 项目，用于演示如何使用 Cloudflare 的向量化存储（Vectorize）功能。该项目展示了如何构建一个简单的向量数据库 API，可用于存储和检索文本数据的向量表示。

## 功能特点

- 使用 Cloudflare Workers AI 进行文本嵌入
- 支持文本存储和向量化
- 支持相似文本搜索
- 支持文档删除
- 包含基本的认证机制
- 支持 CORS

## 技术栈

- [Hono](https://hono.dev/) - 轻量级的 Web 框架
- [Cloudflare Workers](https://workers.cloudflare.com/) - 边缘计算平台
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) - 向量数据库服务
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) - AI 推理服务
- [LangChain](https://js.langchain.com/) - AI 应用开发框架

## 快速开始

### 1. 安装依赖 

```bash
pnpm install
```


### 2. 创建 Vectorize 数据库

```bash
wrangler vectorize create langchain_ai_docs_index --preset @cf/baai/bge-base-en-v1.5
```

## 3. 配置环境变量

复制 `.dev.vars.example` 到 `.dev.vars` 并填写必要的环境变量：

```ini
CLOUDFLARE_ACCOUNT_ID=你的账户ID
CLOUDFLARE_WORKERSAI_API_TOKEN=你的API令牌
AUTH_TOKEN=自定义token用于防刷
```
复制 wrangler.toml.example 到 wrangler.toml 并填写必要的环境变量

## 4. 运行项目

```bash
wrangler dev --remote
```

## 5. 部署项目

```bash
wrangler deploy
```
## API 接口

### 存储文本

```bash
curl -X POST http://localhost:8787/store \
-H "Authorization: your_auth_token" \
-H "Content-Type: application/json" \
-d '{"text": "your_text_here"}'
```

### 搜索文本

```bash
curl -X POST http://localhost:8787/search \
-H "Authorization: tymm111111" \
-H "Content-Type: application/json" \
-d '{"query": "your_text_here", "limit": 5}'
```

### 删除文本

```bash
curl -X POST http://localhost:8787/delete \
-H "Authorization: your_auth_token" \
-H "Content-Type: application/json" \
-d '{"id": "your_id_here"}'
```


## 安全性说明

- 所有 API 端点都需要通过 `Authorization` 头进行认证
- 删除操作需要额外的确认令牌
- 建议在生产环境中实施更严格的安全措施

## 注意事项

1. 确保你有一个有效的 Cloudflare 账户和必要的 API 令牌
2. 建议在生产环境中添加适当的错误处理和日志记录
3. 注意管理和保护你的认证令牌

## 参考资源

- [Cloudflare Workers API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- [Cloudflare Vectorize 文档](https://developers.cloudflare.com/vectorize/)
- [Hono 文档](https://hono.dev/)
- [LangChain 文档](https://js.langchain.com/)

## License


