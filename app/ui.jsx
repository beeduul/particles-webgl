var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

var Checkbox = React.createClass({
  handleOnClick: function(event) {
    var value = event.target.checked ? 1 : 0;
    app.setSimulationValue(this.props.param, value);
  },

  render: function() {
    return (
      <div className='parameter'>
        <input type = 'checkbox' onClick={this.handleOnClick} value={this.props.param.value} />
        <span className='title'>{this.props.param}</span>
      </div>
    );
  }
});

var Slider = React.createClass({  
  toSliderValue: function() {
    var param = app.getSimulationParam(this.props.param);
    var delta = param.max - param.min;
    var simValue = app.getSimulationValue(this.props.param);
    var value = (simValue - param.min) / delta * 100.0;
    return value;
  },

  getParamMin: function() {
    return app.getSimulationParam(this.props.param).min
  },

  getParamMax: function() {
    return app.getSimulationParam(this.props.param).max
  },

  handleOnInput: function(event) {
    var param = app.getSimulationParam(this.props.param);
    var delta = param.max - param.min;
    var value = event.target.value / 100.0 * delta + param.min;

    console.log("handleOnInput", this.props.param, event.target.value, value, param);
    app.setSimulationValue(this.props.param, value);
  },

  render: function() {
    return (
      <div className='parameter'>
        <input className="slider" type="range" defaultValue={this.toSliderValue()} min='0' max='100' onInput={this.handleOnInput}/>
        <span className='title'>{this.props.param}</span>
      </div>
    );
  }
});

var UI = React.createClass({
  componentDidMount: function() {
    app.init();
  },
  
  render: function() {
    return (
      <div id="ui">
        <Slider param={'particleSize'} />
        <Slider param={'particleLifetime'} />
        <Slider param={'particleDensity'} />
        <Slider param={'symmetry'} />
        <Slider param={'friction'} />
        <Slider param={'pulseFrequency'} />
        <Slider param={'positionalNoise'} />
        <Slider param={'directionalNoise'} />
        <Slider param={'colorNoise'} />
        <Checkbox param={'gravityType'} />
      </div>
    )
  }
});

var Canvas = React.createClass({
  render: function() {
    return (
      <canvas id="glcanvas">
        Your browser doesnt appear to support the <code>&lt;canvas&gt;</code> element.
      </canvas>
    )
  }
});

var App = React.createClass({
  render: function() {
    return (
      <div>
        <UI/>
        <Canvas/>
      </div>
    )
  }
});

document.addEventListener('DOMContentLoaded', function() {
  var appElement = document.getElementById("app");
  console.log("DOMContentLoaded", appElement);
  ReactDOM.render(<App/>, appElement);
}, false);
