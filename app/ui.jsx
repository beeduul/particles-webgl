var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

var Slider = React.createClass({
  
  handleOnInput: function(event) {
    app.setSimulationValue('particleSize', event.target.value);
  },
  
  render: function() {
    return (
      <input class="slider" type="range" value={this.props.particleSize} min="1" max="50" onInput={this.handleOnInput}/>
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
        <Slider particleSize={app.getSimulationValue('particleSize')}/>
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
