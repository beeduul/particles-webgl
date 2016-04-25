var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

var ParamsMixin = {
  getParamValue: function() {
    return app.getSimulationValue(this.props.param)
  },

  handleOnInput: function(event) {
    app.setSimulationValue(this.props.param, event.target.value);
  }
  
};

var Slider = React.createClass({  
  mixins: [ParamsMixin],
  
  getParamMin: function() {
    return app.getSimulationParam(this.props.param).min
  },
  
  getParamMax: function() {
    return app.getSimulationParam(this.props.param).max
  },
  
  render: function() {
    return (
      <div className='parameter'>
        <input className="slider" type="range" defaultValue={this.getParamValue()} min={this.getParamMin()} max={this.getParamMax()} onInput={this.handleOnInput}/>
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
        <Slider param={'colorNoise'} />
        <Slider param={'positionalNoise'} />
        <Slider param={'directionalNoise'} />
        <Slider param={'particleSize'} />
        <Slider param={'particleLifetime'} />
        <Slider param={'particleDensity'} />
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
