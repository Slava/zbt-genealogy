import React, { Component } from 'react';
import Autosize from './Autosize';
import Autosuggest from 'react-autosuggest';
import autoBind from 'react-autobind';

import './App.css';

import SvgMap from './SvgMap';
import {flatten} from './util';
import data from './data';

window.data = data

class SearchControl extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      suggestions: [],
      value: '',
    };
  }
  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue
    });
  };

  // Autosuggest will call this function every time you need to update suggestions.
  // You already implemented this logic above, so just use it.
  onSuggestionsFetchRequested = ({ value }) => {
    this.setState({
      suggestions: this.props.getSuggestions(value)
    });
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: []
    });
  };

  render() {
    const { value, suggestions } = this.state;

    const getSuggestionValue = (node) => node.name;
    const renderSuggestion = ({name}) => <div>{name}</div>;

    // Autosuggest will pass through all these props to the input.
    const inputProps = {
      placeholder: 'Search...',
      value,
      onChange: this.onChange,
    };

    // Finally, render it!
    return (
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        onSuggestionSelected={this.props.onSelection}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={renderSuggestion}
        inputProps={inputProps}
      />
    );
  }
}

class App extends Component {
  constructor(props, context) {
    super(props, context);
    this.Viewer = null;
    this.state = {
      highlighted: '',
      concealChildren: false,
      showHelp: false,
    };
    this.mapRef = React.createRef();

    autoBind(this);
  }

  componentDidUpdate() {
    this.Viewer && this.Viewer.fitToViewer();
  }

  render() {
    this.removeDeactivated(data);
    this.calcLayout(data);
    this.calcPosition(data);
    const {els, curves} = this.draw(data);

    const headers = levels.map((name, i) => this.makeHeader({ x: paddingX + i * (nodeWidth + nodeHorizontalMargin), y: paddingY - nodeHeight }, name));


    return (
      <div className="App">
        <div className="panel">
          <SearchControl onSelection={(e, {suggestion}) => this.focusNode(suggestion)} getSuggestions={(s) => this.findNode(data, s)}/>
          <button className="help-button" onClick={() => this.setState({ showHelp: !this.state.showHelp })}>?</button>
        </div>
        <div className="help" style={{display: this.state.showHelp ? 'block' : 'none'}}>
          <a href="#" onClick={() => this.setState({ showHelp: false })}>X</a>
          <h1>ZBT Geneology</h1>
          <p>Navigate by dragging the canvas. Zoom in and out with the mouse wheel.</p>
          <p>Click on a node to hide/reveal its children.</p>
          <p>Double click on a node to highlight its path to root.</p>
          <p>Click on a heading to only show nodes leading to nodes representing that class.</p>
          <p>Click the heading again to reveal selected class' children.</p>
          <p>Search for a person using the searchbar in the top right.</p>
        </div>
        <Autosize>
          <SvgMap innerRef={this.mapRef}>
            <svg className="Map" id="Map" width={8000} height={8000}>
              {headers}{curves}{els}
            </svg>
          </SvgMap>
        </Autosize>
      </div>
    );
  }

  removeDeactivated(node) {
    node.children = node.children.filter(c => c.bio !== 'Deactivated');
    node.children.forEach((child) => {
      this.removeDeactivated(child);
    });
  }

  calcLayout (node) {
    const layout = { size: 0 };

    if (node.hidden) {
      node.layout = layout;
      return;
    }

    !node.concealed && node.children.forEach((child) => {
      this.calcLayout(child);
      layout.size += child.layout.size;
    });

    if (!node.children.length || node.concealed)
      layout.size = 1;

    node.layout = layout;
  }

  calcPosition (node, offset) {
    const position = offset || { x: 0, y: 0 };
    let accumY = position.y;

    !node.concealed && node.children.forEach(child => {
      this.calcPosition(child, { x: levelMap[child.bio], y: accumY });
      accumY += child.layout.size;
    });

    node.position = position;
  }

  draw(node) {
    if (node.hidden) return {els: [], curves: []};

    const { position } = node;
    const drawPosition = { x: paddingX + position.x * (nodeWidth + nodeHorizontalMargin), y: paddingY + position.y * nodeHeight };
    const root = this.makeNode(drawPosition, node.name, node);
    let els = [root];
    let curves = [];

    !node.concealed && node.children.forEach(child => {
      const sub = this.draw(child);
      els = els.concat(sub.els);
      curves = curves.concat(sub.curves);
      if (!child.hidden)
        curves.push(this.makeCurve(drawPosition, child.drawPosition, node.name, child.name));
    });

    node.drawPosition = drawPosition;
    return {els, curves};
  }

  makeNode({x, y}, nodeText, node) {
    const colorBg = node.highlighted ? primaryColor : backgroundColor;
    const colorFg = node.highlighted ? backgroundColor : primaryColor;
    const rect = <rect
      x={x - nodeWidth / 2}
      y={y + 7 - nodeHeight / 2}
      height={nodeHeight - textOffset/2}
      width={nodeWidth}
      fill={colorBg}
      rx="5" ry="5"
      strokeWidth={2} stroke={colorFg}
    />;
    const text = <text x={x} y={y + textOffset - nodeHeight / 2} fill={colorFg}>
          {nodeText}{node.concealed ? '...' : ''}
    </text>;
    return <g
        key={node.name}
        onClick={() => this.handleNodeClick(node)}
        onDoubleClick={() => this.handleNodeDoubleClick(node)}
      >{rect}{text}</g>;
  }

  makeCurve(posA, posB, id1, id2) {
    const radius = 10;
    let d = posA.y === posB.y
        ? `M${posA.x},${posA.y} h${posB.x-posA.x}`
        : `M${posA.x},${posA.y} v${posB.y-posA.y-radius} a${radius},${radius} 0 0 0 ${radius},${radius} h${posB.x-posA.x-radius}`;
    return <path
        key={`${id1}/${id2}`}
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />;
  }

  makeHeader({x, y}, name) {
    const rect = <rect
      x={x - nodeWidth / 2}
      y={y + 7 - nodeHeight / 2}
      height={nodeHeight - textOffset/2}
      width={nodeWidth}
      fill={headerColor}
    />;
    const text = <text style={{fontWeight: 'bold'}} x={x} y={y + textOffset - nodeHeight / 2} fill={backgroundColor}>
          {name}
    </text>;
    return <g onClick={() => this.handleHeaderClick(name)} key={name}>{rect}{text}</g>;
  }

  handleNodeClick(node) {
    node.concealed = !node.concealed;
    this.forceUpdate();
  }

  handleNodeDoubleClick(node) {
    this.clearTree(data);
    this.setState({highlighted: null});
    this.highlightPath(data, node.name);
    this.forceUpdate();
  }

  handleHeaderClick(type) {
    const concealChildren = this.state.highlighted === type ? !this.state.concealChildren : true;
    this.clearTree(data);
    this.markHiddenAndConcealed(data, type, concealChildren);
    this.setState({highlighted: type, concealChildren});
    this.forceUpdate();
  }

  markHiddenAndConcealed(node, type, conceal, blessed=false) {
    node.children.forEach((child) => this.markHiddenAndConcealed(child, type, conceal, blessed || child.bio === type));

    node.concealed = node.bio === type ? conceal : false;

    if (levelMap[node.bio] >= levelMap[type])
      node.hidden = !blessed;
    else
      node.hidden = !node.children.some(child => !child.hidden);

    if (node.bio === type)
      node.highlighted = true;
  }

  clearTree(node) {
    node.concealed = false;
    node.hidden = false;
    node.highlighted = false;
    node.children.forEach((child) => this.clearTree(child));
  }

  highlightPath(node, target) {
    node.children.forEach((child) => this.highlightPath(child, target));
    node.highlighted = node.name === target || node.children.some(child => child.highlighted);
  }

  focusNode(node) {
    if (!node) return;
    this.clearTree(node);
    node.highlighted = true;
    const {drawPosition} = node;
    this.mapRef.current.set(drawPosition.x, drawPosition.y);
    this.forceUpdate();
  }

  findNode(node, name) {
    if (node.name.match(new RegExp(name, 'i')))
      return node;
    return flatten(node.children.map((child) => this.findNode(child, name)));
  }
}


const levels = [
  "root",
  "Alpha Gamma",
  "Alpha Delta",
  "Alpha Epsilon",
  "Alpha Zeta",
  "Alpha Eta",
  "Alpha Theta",
  "Alpha Iota",
  "Alpha Kappa",
  "Alpha Lambda",
  "Alpha Mu",
  "Alpha Nu",
  "Alpha Xi",
  "Alpha Omicron",
  "Alpha Pi",
  "Alpha Rho",
  "Alpha Sigma",
  "Alpha Tau",
  "Alpha Upsilon",
  "Alpha Phi",
  "Alpha Chi",
  "Alpha Psi",
  "Alpha Omega",
  "Beta Alpha",
  "Beta Beta",
  "Beta Gamma",
  "Beta Delta",
  "Beta Epsilon",
  "Beta Zeta",
  "Beta Eta",
  "Beta Theta",
  "Beta Iota",
  "Beta Kappa",
  "Beta Lambda",
  "Beta Mu"
];
const levelIdReversed = levels.map((x, i) => i).reverse();

const levelMap = {};
levels.forEach((level, i) => levelMap[level] = i);

const paddingX = 100;
const paddingY = 300;
const nodeWidth = 180;
const nodeHeight = 50;
const textOffset = 30;
const nodeHorizontalMargin = 20;
const primaryColor = "#C4E4EB";
const headerColor = primaryColor;
const strokeColor = "#CCC";
const backgroundColor = "#111C34";

export default App;
