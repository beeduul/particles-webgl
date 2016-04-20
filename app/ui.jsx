var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

var UI = React.createClass({
  componentDidMount: function() {
    app.init();
  },
  
  render: function() {
    return (
      <div id="ui">
        <input id="slider" type="range" min="100" max="500" step="10" />
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
