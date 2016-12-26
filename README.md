# Learn us Redux/D3

This repository aims to show how to make a set of Node.js stack work, providing with a small example of graphics application working based on Babel, Webpack, Redux and D3 etc.

## Versions
The behavior of the application was confirmed in Node.js 6.9.1 on OS X, and on Heroku.


## Working Demo

- https://redux-d3-example.herokuapp.com/

[![https://gyazo.com/022c5f8c34626e4176c563b6e382767a](https://i.gyazo.com/022c5f8c34626e4176c563b6e382767a.gif)]


The demo has only a flowing chart and a slider input. A new random data point is added to the chart every step, and its data range is controlled with the slider. We use D3 for rendering the chart and Redux for handling the data change.

## Run It Locally

```
$ git clone git@github.com:satzz/redux-d3-example.git 
$ cd redux-d3-example

$ npm i
$ npm run build

$ npm start
```
That's it! The server starts at `localhost:5000`.


## Directory Tree
The main files for the application are below.

```
├── client.js
├── package.json
├── scss
│   ├── InputRange.scss
|   ...
├── server.js
├── views
│   └── index.pug
└── webpack.config.js
```

When working, it also generates a little bit more files as we will see later.

  
## Stacks

### Transpiling

`npm run build` defines two steps for hosting the application.

1. Babel transpiles `client.js` into `client.built.js` and `server.js` into `server.built.js`.
1. Webpack bundles required modules for hosting.



`package.json`:
```
 "build": "babel server.js -o server.built.js && babel client.js -o client.built.js && webpack -v --config webpack.config.js",
```

We also need two Babel presets: `babel-preset-es2015` for using `import` and `babel-preset-react` for transpiling React Components. If we want to use `async` to mount koa middlewares, we need `babel-preset-stage-0`.

And we also need `babel-polyfill` to make browsers understand `import`.


### Bundling

Webpack bundles up static files into `static` directory. 

`webpack.config.js`:
```
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const extractCSS = new ExtractTextPlugin('[name].css');

module.exports = {
  entry: {
    client: [
      './client.built.js',
    ],
    page: [
      './scss/page.scss',
    ],
    range: [
      './scss/InputRange.scss',
    ],
  },
  output: {
    path: './static',
    filename: "[name].js",
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loader: extractCSS.extract(['css', 'sass'])
      },
    ],
  },
  plugins: [
    extractCSS
  ],
}

```


### Server
We choose `Koa`, "Express' spiritual successor" as our web framework. 
Koa@2 allows to use `async` instead of generators.
Some middlewares have different interfaces from those to Koa@1.
The server uses three middlewares(`koa-router`, `koa-static`, `koa-pug`)

`server.js`:
```
import 'babel-polyfill';
import Koa from 'koa';

const app = new Koa();

..

app.listen(process.env.PORT || 5000);
```

### Routing


```
const router = require('koa-router')();

app.use(router.routes());

router.get('/', async (ctx) => {
  ctx.render('index', { title: 'Koa + Redux + D3' });
});
```

### Static Files


```
const server = require('koa-static');

app.use(server('static'));
```

### Templating

```
const Pug = require('koa-pug');

new Pug({
  app,
  viewPath: './views',
  basedir: './views',
});
```

Pug is what was formerly known as Jade.

### CSS

`react-input-range` provides default scss files, which are copied and located in our `scss/`.
These scss files are released under the MIT license.(https://github.com/davidchin/react-input-range/blob/master/LICENSE)

With Webpack, CSS also could be modularized. We only have to include `InputRange.scss` as an entry point.
The CSS modules could be embedded in JS, but for now we use `extractCSS` to keep CSS files separated from JS.


### Client: Components and State
Now we are moving to the client side code.

React, as many of us love it, is now one of the first choices for rendering stateful DOMs.
We are free from the painful re-rendering of screen elements thanks to React, but we still have to manage our states.
With Redux, the main part of our experiment, we can describe and handle states in a unified way. We don't even call `setState` of React.

A standard Redux application has three layers.

1. Store: initializes and holds the state.
1. Actions: describes what has happened(user inputs, time clocks, and so on.)
1. Reducers: calculates the next state from the current state and the action given.

And when we use Redux, we will build two types of components, presentational and container.
I cannot explain everything here, but the tutorial and the table here should be helpful for understanding.

- http://redux.js.org/docs/basics/UsageWithReact.html

Usually we separate these layers by directory structure and export functions and objects to each other, but we don't do so and write everything in our `client.js`, just to keep our understanding simple.

Let's see a simple presentational component, `Slider`.
`react-input-range` provides a component with a slider input interface.

- https://github.com/davidchin/react-input-range

We can write it as a stateless functional component, which keeps the component pretty simple. We do not see `render`.


`client.js`:

```
const Slider = ({ onChange, min, max }) => (
  <InputRange
    maxValue={height}
    minValue={0}
    value={{ min, max }}
    onChange={onChange}
  />
);
```

The props of the component are fed from outside, by `react-redux`.
`connect` generates a container component that works, connecting the store and the presentational component.

```
const SliderContainer = connect(
  state => (
    {
      min: state.sliderMin,
      max: state.sliderMax,
    }
  ),
  dispatch => (
    {
      onChange: (component, values) => {
        dispatch(changeSliderMin(values.min));
        dispatch(changeSliderMax(values.max));
      },
    }
  ),
)(Slider);
```

Action creators translate dispatched values into actions.

```
const changeSliderMin = value => (
  { type: 'CHANGE_SLIDER_MIN', value }
);
```

A reducer for the slider input could be like this. The next state will be just the value it receives (we will soon see the case where there is small calculation).

```
const sliderMin = (state = initialState.sliderMin, action) =>
  (action.type === 'CHANGE_SLIDER_MIN' ? action.value : state);
```

Redux serves a magic, `combineReducers`, which literally combines reducers into one reducer.

```
const rootReducer = combineReducers({
  sliderMin,
  sliderMax,
  time,
  chartData,
});
```

Now we create the store from reducers and initialize the state.
What matters here is that reducers and the keys of the state should have the same name.

```
const initialState = {
  sliderMin: Math.floor(height * 0.2),
  sliderMax: Math.floor(height * 0.3),
  time: 0,
  chartData: [],
};

const store = createStore(rootReducer, initialState);
```




### Graphics
D3 is one of the popular visualization libraries.
We use D3 to render SVG from data.
Embedding D3 into React components can be sort of tricky, because both can handle the state.
There seems no silver bullet, but in this case, life cycle methods of React meat the goal.
Unfortunately, components with life cycle methods should not be functional but class-based.

```
class Chart extends Component {
  componentDidMount() {
    d3.interval(() => { this.props.onTick(this.props); }, interval);
  }
  componentDidUpdate() {
    const line = d3.line()
      .x(d => d.x)
      .y(d => d.y);
    d3.select('path')
      .datum(this.props.chartData)
      .attr('d', line);
  }
  render() {
    return (
      <svg width={width} height={height} >
        <path
          fill="none"
          stroke="gray"
          strokeWidth="2"
          transform={this.props.transform}
        />
      </svg>
    );
  }
}
```
`this.props.onTick` is a function given by the store, as we will see below.


`this.props.chartData` is a series of the position to render, as we can see in `propTypes`.
The `propTypes` definition is not mandatory to make the component work but I add it for ESLint.

```
Chart.propTypes = {
  transform: PropTypes.string.isRequired,
  onTick: PropTypes.func.isRequired,
  chartData: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired).isRequired,
};
```

`chartData` is calculated by a reducer. By a small math, it adds a random point to the state and remove old one.

```
const chartData = (state = initialState.chartData, action) => {
  if (action.type !== 'TICK_TIME') { return state; }
  const values = action.values;
  const rnd = (2 * Math.random()) - 1;
  const alpha = ((Math.atan(rnd) / Math.PI) * 2) + 0.5;
  const y = values.min + ((values.max - values.min) * alpha);
  const x = (values.time / visiblePoints) * width;
  const a = state.concat({ x, y });
  const extra = a.length - visiblePoints;
  return extra >= 1 ? a.slice(extra) : a;
};
```

Likewise, `time` is changed by `TICK_TIME` action.

```
const time = (state = initialState.time, action) =>
  (action.type === 'TICK_TIME' ? state + 1 : state);
```

`TICK_TIME` is triggered by an action creator `tickTime`.

```
const tickTime = values => (
  { type: 'TICK_TIME', values }
);
```

And `tickTime` is dispatched on `onTick` by `connect`.



```
const ChartContainer = connect(
  state => (
    {
      transform: `translate(${(1 - (state.time / visiblePoints)) * width} ${height}) scale(1 -1) `,
      chartData: state.chartData,
      time: state.time,
      min: state.sliderMin,
      max: state.sliderMax,
    }
  ),
  dispatch => (
    {
      onTick: (values) => {
        dispatch(tickTime(values));
      },
    }
  ),
)(Chart);
```
To recap, here is how the SVG rendering works through the redux dataflow:

1. After `Chart` component is mounted, `d3.interval` starts and repeatedly triggers `onTick` function.
2. `onTick` is dispatched to `tickTime` action creator, as `connect` defines so. 
3. `tickTime` returns `TICK_TIME` action.
4. Two reducers, `time` and `chartData`, calculate the next state from `TICK_TIME` action.
5. `Chart` component receives the state chanegs as props changes, as `connect` defines so.
6. `componentDidUpdate` calculates the SVG attributes by d3 and the new props.
7. `render` updates the SVG using the new attributes.

### Linting

Linting does not matter to how the code works, but helps keeping the code under some rules.
By executing `npm run lint`, we can check that.

`package.json`:
```
"lint": "eslint client.js && eslint server.js",
```

We basically follow `eslint-config-airbnb`, which is widely agreed, and turn off some of them exceptionally.

`.eslintrc.json`:
```
{
  "extends": "airbnb",
  "env": {
    "browser": true
  },
  "rules": {
    "react/jsx-filename-extension": "off",
    "no-new": "off"
  }
}
```
ES6 provides the new syntaxes for defining variables securely, `let` and `const`.
Since our ESLint rules include `no-var` and `prefer-const` by default, we can keep ourselves from writing more `var` and `let` than necessary. For example, if we use `let` to define `width`, we'll get an error.

```
$ npm run lint

> redux-d3-sample@1.0.0 lint /Users/satzz/redux-d3-sample
> eslint client.js && eslint server.js


/Users/satzz/redux-d3-sample/client.js
  8:5  error  'width' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (1 error, 0 warnings)
```



### Testing

This repository has no tests. (Sorry!)


### Hosting

After making sure that the application works in local environments, we can do the same on Heroku. Here is how:

```
$ heroku create --app redux-d3-example
Creating ⬢ redux-d3-example... done
https://redux-d3-example.herokuapp.com/ | https://git.heroku.com/redux-d3-example.git

$ git push https://git.heroku.com/redux-d3-example.git master
..
remote: -----> Launching...
remote:        Released v3
remote:        https://redux-d3-example.herokuapp.com/ deployed to Heroku
remote: 
remote: Verifying deploy... done.
To https://git.heroku.com/redux-d3-example.git
 * [new branch]      master -> master

```

Here is a working example.

- https://redux-d3-example.herokuapp.com/

Heroku automatically detects `package.json` and recognizes that the application is written in and should be hosted using Node.js. Also, `heroku-postbuild` command enables instruct Heroku what to do on pushing.

```package.json
"heroku-postbuild": "npm run build",
```
