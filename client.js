import * as d3 from 'd3';
import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';
import InputRange from 'react-input-range';
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';

const width = 600;
const height = 300;
const visiblePoints = 100;
const interval = 100;

// INITIAL STATE
const initialState = {
  sliderMin: Math.floor(height * 0.2),
  sliderMax: Math.floor(height * 0.3),
  time: 0,
  chartData: [],
};

// REDUCERS
const sliderMin = (state = initialState.sliderMin, action) =>
  (action.type === 'CHANGE_SLIDER_MIN' ? action.value : state);

const sliderMax = (state = initialState.sliderMax, action) =>
  (action.type === 'CHANGE_SLIDER_MAX' ? action.value : state);

const time = (state = initialState.time, action) =>
  (action.type === 'TICK_TIME' ? state + 1 : state);

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

const rootReducer = combineReducers({
  sliderMin,
  sliderMax,
  time,
  chartData,
});

// STORE
const store = createStore(rootReducer, initialState);

// ACTION CREATORS
const changeSliderMin = value => (
  { type: 'CHANGE_SLIDER_MIN', value }
);
const changeSliderMax = value => (
  { type: 'CHANGE_SLIDER_MAX', value }
);
const tickTime = values => (
  { type: 'TICK_TIME', values }
);

// PRESENTATIONAL COMPONENTS

// STATELESS FUNCTIONAL COMPONENT
const Slider = ({ onChange, min, max }) => (
  <InputRange
    maxValue={height}
    minValue={0}
    value={{ min, max }}
    onChange={onChange}
  />
);
Slider.propTypes = {
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

// CLASS BASED COMPONENT
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
Chart.propTypes = {
  transform: PropTypes.string.isRequired,
  onTick: PropTypes.func.isRequired,
  chartData: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired).isRequired,
};


// CONTAINER COMPONENTS
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

// ENTRY POINT(RENDER)
render(
  <div>
    <Provider store={store}>
      <ChartContainer />
    </Provider>
    <Provider store={store}>
      <SliderContainer />
    </Provider>
  </div>,
  document.getElementById('app'),
);

