import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { fail } from './utils/response';

const app = express();

// CORS:允许前端 dev server 跨域
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// body 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', routes);

// 404
app.use((_req, res) => {
  fail(res, '接口不存在', 404, 404);
});

// 全局错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  fail(res, err.message || '服务器内部错误', 500, 500);
});

app.listen(config.port, () => {
  console.log(`[server] running at http://localhost:${config.port}`);
});

export default app;
