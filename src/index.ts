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
  // 先获取文本的向量嵌入
  const embedding = await vectorstore.embeddings.embedQuery(text);
  
  // 生成 ID
  const encoder = new TextEncoder();
  const insecureHash = await crypto.subtle.digest(
    'SHA-1',
    encoder.encode(text)
  );
  const hashArray = Array.from(new Uint8Array(insecureHash));
  const readableId = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 使用 upsert 方法，添加 metadata
  const result = await vectorstore.index.upsert([{
    id: readableId,
    values: embedding,
    metadata: {
      text: text  // 存储原始文本到 metadata
    }
  }]);

  return { id: readableId, result };
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

    const { id, result } = await upsertDocToVectorstore(vectorstore, text);

    return c.json({ 
      success: true, 
      message: '文本已成功存储',
      id: id,
      ids: result.ids
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

    // 获取查询文本的向量嵌入
    const queryEmbedding = await embeddings.embedQuery(query);

    // 直接使用 Vectorize API 进行查询
    const results = await vectorstore.index.query(queryEmbedding, {
      topK: limit,
      returnValues: false,
      returnMetadata: 'all'  // 返回所有 metadata
    });

    return c.json({ 
      success: true,
      results: results.matches.map(match => ({ 
        id: match.id,
        txt: match.metadata?.content || 'Not found'
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
    const { id } = await c.req.json<{ 
      id: string;
    }>();
    
    if (!id) {
      return c.json({ error: 'ID不能为空' }, 400);
    }

    const embeddings = new CloudflareWorkersAIEmbeddings({
      binding: c.env.AI,
      modelName: '@cf/baai/bge-base-en-v1.5'
    });

    const vectorstore = new CloudflareVectorizeStore(embeddings, {
      index: c.env.VECTORIZE_INDEX
    });

    // 使用 deleteByIds 方法
    const result = await vectorstore.index.deleteByIds([id]);

    return c.json({ 
      success: true, 
      message: '文档已成功删除',
      mutationId: result.ids
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