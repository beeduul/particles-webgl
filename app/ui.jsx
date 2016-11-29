var React = require('react');
var ReactDOM = require('react-dom');

var app = require('app');

let DrawTypes = require('drawtypes');

class Checkbox extends React.Component {
  handleOnClick(event) {
    var value = event.target.checked ? 1 : 0;
    app.setPaletteValue(this.props.param, value);
  }

  render() {
    return (
      <div className='parameter'>
        <input type = 'checkbox' onClick={ (event) => this.handleOnClick(event) } value={this.props.param.value} />
        <span className='title'>{this.props.param}</span>
      </div>
    );
  }
}

class Choices extends React.Component {
  onInput(event) {
    this.props.palette.drawType = event.target.value;
  }
  
  render() {
    let options = this.props.choices.map(function(pair) {
      DrawTypes.checkDrawType(pair[0]);
      return <option key={pair[0]} value={pair[0]}>{pair[1]}</option>;
    })
    return <select defaultValue={this.props.palette.drawType} onInput={ (event) => this.onInput(event)}>{options}</select>;
  }
}

class Slider extends React.Component {
  toSliderValue() {
    var param = app.getPaletteParam(this.props.paramName);
    var delta = param.max - param.min;
    var simValue = app.getPaletteValue(this.props.paramName);
    var value = (simValue - param.min) / delta * 100.0;
    return value;
  }

  getParamMin() {
    return app.getPaletteParam(this.props.paramName).min
  }

  getParamMax() {
    return app.getPaletteParam(this.props.paramName).max
  }

  handleOnInput(event) {
    var param = app.getPaletteParam(this.props.paramName);
    var delta = param.max - param.min;
    var value = event.target.value / 100.0 * delta + param.min;

    app.setPaletteValue(this.props.paramName, value);
  }

  render() {
    return (
      <div className={'parameter ' + this.props.paramName}>
        <input className="slider" type="range" defaultValue={this.toSliderValue()} min='0' max='100' onInput={ (event) => this.handleOnInput(event) }/>
        <span className='title'>{this.props.paramName}</span>
      </div>
    );
  }
}

class PalettePresets extends React.Component {
  onInput(event) {
    // select preset
    app.setPreset(event.target.value);
  }

  render() {
    let options = this.props.presetNames.map(function(presetName) {
      return <option key={presetName} value={presetName}>{presetName}</option>;
    });

    return (
      <div className='palette-presets'>
        <select onInput={ (event) => this.onInput(event) }>
          <option key='__internal_noop_header__' value=''>Select a Preset</option>
          { options }
        </select>
      </div>
    );
  }
}

class LayerPalette extends React.Component {
  render() {

    const sliderKeys = ['size', 'age', 'flow', 'symmetry', 'pulse', 'spray', 'colorNoise', 'colorHue', 'saturation', 'accel', 'decay'];

    let self = this;
    let layer = self.props.layer;
    let palette = layer.palette;
    
    let sliders = sliderKeys.map(function(sliderKey) {
      return <Slider palette={palette} paramName={sliderKey} key={`LayerPalette_${palette.uid}_${sliderKey}`} />
    });

    return (
      <div id="palette">
        { sliders }
        <Choices key={`LayerPalette_${palette.uid}_Choices`} palette={palette} choices={ [
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
}

class SelectLayerButton extends React.Component {
  handleClick() {
    app.selectLayer(this.props.layerIndex);
  }
  
  render() {
    const className = "layer " + (this.props.isActive ? " active" : "");
    return <div className={className} onClick={ (event) => this.handleClick(event) }>[{this.props.layerIndex + 1}]</div>
  }
}

class AddLayerButton extends React.Component {
  handleClick() {
    app.addLayer();
  }
  
  render() {
    return <div className='layer' onClick={ (event) => this.handleClick(event) }>[ + ]</div>;
  }
}

class UI extends React.Component {
  render() {
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
        <PalettePresets presetNames={app.getPresetNames()}/>
        <LayerPalette layer={app.activeLayer} />
      </div>
    );
  }
}

var updateUI = function() {
  var ui = document.getElementById("ui");
  ReactDOM.render(<UI app={app} />, ui);
}

document.addEventListener('DOMContentLoaded', function() {
  app.init(updateUI);
}, false);
