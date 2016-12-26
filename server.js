import 'babel-polyfill';
import Koa from 'koa';

const app = new Koa();

const Pug = require('koa-pug');

new Pug({
  app,
  viewPath: './views',
  basedir: './views',
});

const router = require('koa-router')();

app.use(router.routes());

router.get('/', async (ctx) => {
  ctx.render('index', { title: 'Koa + Redux + D3' });
});

const server = require('koa-static');

app.use(server('static'));

app.listen(process.env.PORT || 5000);
