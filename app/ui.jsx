var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

let DrawTypes = require('drawtypes');

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
    this.props.layer.setDrawType(event.target.value);
  },
  
  render: function() {
    let options = this.props.choices.map(function(pair) {
      DrawTypes.checkDrawType(pair[0]);
      return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>;
    })
    return <select defaultValue={this.props.layer.drawType} onInput={this.onInput}>{options}</select>;
  }
});

var Slider = React.createClass({  
  toSliderValue: function() {
    var param = app.getPaletteParam(this.props.paramName);
    var delta = param.max - param.min;
    var simValue = app.getPaletteValue(this.props.paramName);
    var value = (simValue - param.min) / delta * 100.0;
    return value;
  },

  getParamMin: function() {
    return app.getPaletteParam(this.props.paramName).min
  },

  getParamMax: function() {
    return app.getPaletteParam(this.props.paramName).max
  },

  handleOnInput: function(event) {
    var param = app.getPaletteParam(this.props.paramName);
    var delta = param.max - param.min;
    var value = event.target.value / 100.0 * delta + param.min;

    app.setPaletteValue(this.props.paramName, value);
  },

  render: function() {
    return (
      <div className={'parameter ' + this.props.paramName}>
        <input className="slider" type="range" defaultValue={this.toSliderValue()} min='0' max='100' onInput={this.handleOnInput}/>
        <span className='title'>{this.props.paramName}</span>
      </div>
    );
  }
});

var LayerPalette = React.createClass({
  render: function() {

    const sliderKeys = ['size', 'age', 'flow', 'symmetry', 'pulse', 'spray', 'colorNoise', 'colorHue', 'saturation', 'accel', 'decay'];

    let self = this;
    let layer = self.props.layer;
    let palette = layer.palette;
    
    let sliders = sliderKeys.map(function(sliderKey) {
      return <Slider palette={palette} paramName={sliderKey} key={`LayerPalette_${layer.uid}_${sliderKey}`} />
    });

    return (
      <div id="palette">
        { sliders }
        <Choices key={`LayerPalette_${layer.uid}_Choices`} layer={layer} choices={ [
          ['LINES',           '\u007c'],
          // ['TRI_FILLED',     '\u25B2'],
          ['TRI_STROKED',    '\u25B3'],
          // ['SQUARE_FILLED',  '\u25A0'],
          ['SQUARE_STROKED', '\u25A1'],
          ['CIRCLE_SHADED',  '\u25CF'],
          // ['CIRCLE_STROKED', '\u25CB']
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
    let app = this.props.app;
    
    let layers = [];
    for (let i = 0; i < app.layers.length; i++) {
      let layer = app.layers[i];
      let isActive = layer == app.activeLayer;
      layers.push(<SelectLayerButton isActive={isActive} layerIndex={i} key={`SelectLayerButton_layer${layer.uid}}`}/>);
    }
    layers.push(<AddLayerButton key='AddLayerButton'/>);
    
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
  ReactDOM.render(<UI app={app} />, ui);
}

document.addEventListener('DOMContentLoaded', function() {
  app.init(updateUI);
}, false);
