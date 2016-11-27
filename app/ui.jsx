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

var Choices = React.createClass({
  onInput: function(event) {
    app.setDrawType(event.target.value);
  },
  
  render: function() {
    var options = this.props.choices.map(function(pair) {
      return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>;
    })
    return <select onInput={this.onInput}>{options}</select>;
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

var LayerPalette = React.createClass({
  render: function() {

    const sliderKeys = ['size', 'age', 'flow', 'symmetry', 'pulse', 'spray', 'colorNoise', 'colorHue', 'saturation', 'accel', 'decay'];

    let self = this;
    let sliders = sliderKeys.map(function(key) {
      return <Slider layer={self.props.layer} param={key} key={key} />
    });

    return (
      <div id="palette">
        { sliders }
        <Choices choices={ [
          ['line',           '\u007c'],
          // ['tri-filled',     '\u25B2'],
          ['tri-stroked',    '\u25B3'],
          // ['square-filled',  '\u25A0'],
          ['square-stroked', '\u25A1'],
          ['circle-filled',  '\u25CF'],
          // ['circle-stroked', '\u25CB']
        ] } />
      </div>      
    )
  }
});

var SelectLayerButton = React.createClass({
  handleClick: function() {
    app.selectLayer(this.props.layerIndex);
  },
  
  render: function() {
    const className = "layer " + (this.props.isActive ? " active" : "");
    return <div className={className} onClick={this.handleClick}>[{this.props.layerIndex + 1}]</div>
  }
});

var AddLayerButton = React.createClass({
  handleClick: function() {
    app.addLayer();
  },
  
  render: function() {
    return <div className='layer' onClick={this.handleClick}>[ + ]</div>;
  }
});

var UI = React.createClass({
  render: function() {
    
    let layers = [];
    for (let i = 0; i < app.layers.length; i++) {
      let isActive = app.layers[i] == app.activeLayer;
      layers.push(<SelectLayerButton isActive={isActive} layerIndex={i} />);
    }
    layers.push(<AddLayerButton />);
    
    return (
      <div>
        <div id='layers'>
          { layers }
        </div>
        <LayerPalette layer={app.activeLayer} />
      </div>
    );
  }
});

var updateUI = function() {
  var ui = document.getElementById("ui");
  ReactDOM.render(<UI/>, ui);
}

document.addEventListener('DOMContentLoaded', function() {
  app.init(updateUI);
}, false);
