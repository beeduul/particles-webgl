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

  constructor(props) {
    super(props);
    this.state = { saving: false }
  }

  onInput(event) {
    if (event.target.value === '[randomize]') {
      app.randomizePalette();
    } else {
      // select preset
      app.setPreset(event.target.value);
    }
  }

  handleSave() {
    this.state.saving = true;
    app.globalKeyBlockCount++;
    this.state.presetNameError = null;
    app.dirty = true;
  }

  handleCancel() {
    this.state.saving = false;
    app.globalKeyBlockCount--;
    app.dirty = true;
  }

  handleChange(event) {
    console.log(event);
  }
  
  handleKey(event) {
    let presetName = event.target.value;
    this.state.presetNameError = app.checkPresetName(presetName);
    if (event.keyCode == 13) {
      if (!this.state.presetNameError) {
        app.addPreset(presetName);
        this.handleCancel();
      }
    }
    app.dirty = true;
  }

  render() {
    let options = this.props.presetNames.map(function(presetName) {
      return <option key={presetName} value={presetName}>{presetName}</option>;
    });

    let presetSelect = (
      <div>
        <select onInput={ (event) => this.onInput(event) }>
          <option key='__internal_noop_header__' value=''>Select a Preset</option>
          <option key='__internal_randomize__' value='[randomize]'>[randomize]</option>
          { options }
        </select>
        <button name='save' onClick={ () => this.handleSave() }>Save</button>
      </div>
    );

    let presetSave = (
      <div>
        <input placeholder="Name your preset" onKeyUp={ (ev) => this.handleKey(ev) } />
        <button name='x' onClick={ () => this.handleCancel() }>X</button>
      </div>
    );

    let presetUI = this.state.saving ? presetSave : presetSelect;

    return (
      <div className='palette-presets'>
        { presetUI }
        <div className='error'>{this.state.presetNameError}&nbsp;</div>
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
          ['TRI_FILLED',      '\u25B2'],
          ['TRI_STROKED',     '\u25B3'],
          ['SQUARE_FILLED',   '\u25A0'],
          ['SQUARE_STROKED',  '\u25A1'],
          ['HEX_STROKED',     'hex'],
          ['CIRCLE_SHADED',   '\u25CF'],
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

class App extends React.Component {
  componentDidMount() {
    this.props.app.init(updateUI);
  }
  
  handleMouseEvent(event) {
    app.handleMouseEvent(event);
  }

  handleKeyEvent(event) {
    app.handleKeyEvent(event);
  }

  render() {
    let app = this.props.app;
    let ui = null;
    
    if (app.isInitialized() && !app.drawing) {
      let layers = [];

      for (let i = 0; i < app.layers.length; i++) {
        let layer = app.layers[i];
        let isActive = layer == app.activeLayer;
        layers.push(<SelectLayerButton isActive={isActive} layerIndex={i} key={`SelectLayerButton_layer${layer.uid}`}/>);
      }
      layers.push(<AddLayerButton key='AddLayerButton'/>);

      ui = <div id='ui'>
        <div id='layers'>
          { layers }
        </div>
        <PalettePresets presetNames={app.getPresetNames()}/>
        <LayerPalette layer={app.activeLayer} />
      </div>
    }

    let appComponent = (
      <div>
        { ui }
        <canvas id="glcanvas"
          onMouseDown={ this.handleMouseEvent }
          onMouseUp={ this.handleMouseEvent }
          onMouseMove={ this.handleMouseEvent }
        >
          Your browser doesnt appear to support the <code>&lt;canvas&gt;</code> element.
        </canvas>
      </div>
    );
    
    return appComponent
  }
}

var updateUI = function() {
  var appElem = document.getElementById("app");
  ReactDOM.render(<App app={app} />, appElem);
}

document.addEventListener('DOMContentLoaded', function() {
  updateUI();
}, false);
