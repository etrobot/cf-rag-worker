import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { 
  CloudflareVectorizeStore, 
  CloudflareWorkersAIEmbeddings 
} from '@langchain/cloudflare';
import { Document } from '@langchain/core/documents';

// 定义环境变量类型
type Bindings = {
  AI: any;
  VECTORIZE_INDEX: any;
  AUTH_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 添加认证中间件
app.use('/*', async (c, next) => {
  const token = c.req.header('Authorization');
  
  if (token !== c.env.AUTH_TOKEN) {
    return c.json({ error: '未授权访问' }, 401);
  }
  
  await next();
});

// 启用 CORS
app.use('/*', cors());

// 向量化存储文本的函数
async function upsertDocToVectorstore(
  vectorstore: CloudflareVectorizeStore,
  text: string
) {
  // 创建文档对象，并确保 metadata 为空对象
  const doc = new Document({ pageContent: text, metadata: {} });
  doc.metadata = {};  // 确保 metadata 为空
  
  // 使用文本内容的哈希作为 ID
  const encoder = new TextEncoder();
  const insecureHash = await crypto.subtle.digest(
    'SHA-1',
    encoder.encode(doc.pageContent)
  );
  
  // 将哈希转换为可读的十六进制字符串
  const hashArray = Array.from(new Uint8Array(insecureHash));
  const readableId = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const result = await vectorstore.addDocuments([doc], { ids: [readableId] });
  return result;
}

// POST 接口用于接收和存储文本
app.post('/store', async (c) => {
  try {
    const { text } = await c.req.json<{ text: string }>();
    
    if (!text) {
      return c.json({ error: '文本内容不能为空' }, 400);
    }

    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      modelName: '@cf/baai/bge-base-en-v1.5'
    });

    const vectorstore = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    await upsertDocToVectorstore(vectorstore, text);

    return c.json({ 
      success: true, 
      message: '文本已成功存储' 
    });

  } catch (error) {
    console.error('存储失败:', error);
    return c.json({ 
      success: false, 
      error: '存储过程中发生错误' 
    }, 500);
  }
});

// POST 接口用于搜索相似文本
app.post('/search', async (c) => {
  try {
    const { query, limit = 5 } = await c.req.json<{ 
      query: string;
      limit?: number;
    }>();
    
    if (!query) {
      return c.json({ error: '查询内容不能为空' }, 400);
    }

    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      modelName: '@cf/baai/bge-base-en-v1.5'
    });

    const vectorstore = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    // 使用 similaritySearchWithScore 但在返回时不包含 score
    const results = await vectorstore.similaritySearchWithScore(query, limit);

    return c.json({ 
      success: true,
      results: results.map(([doc]) => ({ 
        content: doc.pageContent,
      }))
    });

  } catch (error) {
    console.error('搜索失败:', error);
    return c.json({ 
      success: false, 
      error: '搜索过程中发生错误' 
    }, 500);
  }
});

// POST 接口用于删除文档
app.post('/delete', async (c) => {
  try {
    const { id, confirmToken } = await c.req.json<{ 
      id: string;
      confirmToken: string;
    }>();
    
    if (!id) {
      return c.json({ error: 'ID不能为空' }, 400);
    }

    // 检查确认 token
    if (confirmToken !== c.env.AUTH_TOKEN) {
      return c.json({ error: '确认token无效' }, 403);
    }

    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      modelName: '@cf/baai/bge-base-en-v1.5'
    });

    const vectorstore = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    await vectorstore.delete({ ids: [id] });

    return c.json({ 
      success: true, 
      message: '文档已成功删除'
    });

  } catch (error) {
    console.error('删除失败:', error);
    return c.json({ 
      success: false, 
      error: '删除过程中发生错误' 
    }, 500);
  }
});

export default app; 