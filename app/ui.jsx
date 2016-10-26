var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

var Checkbox = React.createClass({
  handleOnClick: function(event) {
    var value = event.target.checked ? 1 : 0;
    app.setPaletteValue(this.props.param, value);
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
    var param = app.getPaletteParam(this.props.param);
    var delta = param.max - param.min;
    var simValue = app.getPaletteValue(this.props.param);
    var value = (simValue - param.min) / delta * 100.0;
    return value;
  },

  getParamMin: function() {
    return app.getPaletteParam(this.props.param).min
  },

  getParamMax: function() {
    return app.getPaletteParam(this.props.param).max
  },

  handleOnInput: function(event) {
    var param = app.getPaletteParam(this.props.param);
    var delta = param.max - param.min;
    var value = event.target.value / 100.0 * delta + param.min;

    console.log("handleOnInput", this.props.param, event.target.value, value, param);
    app.setPaletteValue(this.props.param, value);
  },

  render: function() {
    return (
      <div className={'parameter ' + this.props.param}>
        <input className="slider" type="range" defaultValue={this.toSliderValue()} min='0' max='100' onInput={this.handleOnInput}/>
        <span className='title'>{this.props.param}</span>
      </div>
    );
  }
});

var UI = React.createClass({
  render: function() {
    return (
      <div id="palette">
        <Slider param={'size'} />
        <Slider param={'age'} />
        <Slider param={'flow'} />
        <Slider param={'symmetry'} />
        <Slider param={'pulse'} />
        <Slider param={'spray'} />
        <Slider param={'colorNoise'} />
        <Slider param={'colorHue'} />
        <Slider param={'saturation'} />
        <Slider param={'accel'} />
        <Slider param={'decay'} />
      </div>
    )
  }
});

document.addEventListener('DOMContentLoaded', function() {
  app.init();
  
  var ui = document.getElementById("ui");
  console.log("DOMContentLoaded, ui:", ui);
  ReactDOM.render(<UI/>, ui);

}, false);
