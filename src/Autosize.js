import React from 'react';
import ReactDOM from 'react-dom';
import autoBind from 'react-autobind';

/**
 * Component for automatically setting a width prop to the DOM node of the first child
 */
export default class AutoSize extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      width: null,
      height: null
    };
    autoBind(this);
  }

  componentDidMount() {
    this._updateWidth();
    window.addEventListener("resize", this._updateWidth);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._updateWidth);
  }

  componentDidUpdate() {
    // need this here to auto resize when window size changes
    if (this._shouldUpdateWidth()) {
      this._updateWidth();
    }
  }

  // Returns true if width prop is auto and the dom node width is different than the stored state width
  _shouldUpdateWidth() {
    const domWidth = this._getDOMDimensions().width;
    return this.state.width !== domWidth;
  }

  // When we update width, we need to recalculate the chart components
  _updateWidth() {
    console.log(this._getDOMDimensions())
    this.setState(this._getDOMDimensions());
  }

  _getDOMDimensions() {
    const node = ReactDOM.findDOMNode(this);
    // we need to use parentNode to get the effective height, otherwise we could just use node.offsetWidth
    const { parentNode } = node;

    // take offset dimensions minus padding
    const padding = {
      top: paddingToNumber(parentNode.style.paddingTop),
      right: paddingToNumber(parentNode.style.paddingRight),
      bottom: paddingToNumber(parentNode.style.paddingBottom),
      left: paddingToNumber(parentNode.style.paddingLeft)
    };

    function paddingToNumber(padding) {
      return !padding ? 0 : parseInt(padding, 10);
    }

    /* note there is a bug when the parent is position absolute top:0, bottom:0
     * setting the dimensions of the inside causes a scrollbar to be added if
     * the relative parent of the absolutely positioned element is the body
     */
    return {
      width: parentNode.offsetWidth - padding.left - padding.right,
      height: parentNode.offsetHeight - padding.top - padding.bottom
    };
  }

  render() {
    if (React.Children.count(this.props.children) > 1) {
      console.warn('AutoSize only works with a single child element.');
    }

    const { width, height } = this.state;
    const child = this.props.children;
    return <div className='react-autosize'><child.type width={width} height={height} {...child.props} ref={child.props.innerRef}/></div>;
  }
};
