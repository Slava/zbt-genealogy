import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';

export default class SvgMap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      matrix: [1, 0, 0, 1, 0, 0],
      dragging: false,
    };
    autoBind(this);
    this.zoom(0.15);
    this.pan(-200, -200);
  }

  onDragStart(e) {
    // Find start position of drag based on touch/mouse coordinates.
    const startX = typeof e.clientX === 'undefined' ? e.changedTouches[0].clientX : e.clientX;
    const startY = typeof e.clientY === 'undefined' ? e.changedTouches[0].clientY : e.clientY;

    // Update state with above coordinates, and set dragging to true.
    const state = {
      dragging: true,
      startX,
      startY
    };

    this.setState(state);
  }

  onDragMove(e) {
    // First check if the state is dragging, if not we can just return
    // so we do not move unless the user wants to move
    if (!this.state.dragging) {
      return;
    }

    // Get the new x coordinates
    const x = typeof e.clientX === 'undefined' ? e.changedTouches[0].clientX : e.clientX;
    const y = typeof e.clientY === 'undefined' ? e.changedTouches[0].clientY : e.clientY;

    // Take the delta where we are minus where we came from.
    const dx = x - this.state.startX;
    const dy = y - this.state.startY;

    // Pan using the deltas
    this.pan(dx, dy);

    // Update the state
    this.setState({
      startX: x,
      startY: y,
    });
  }

  onDragEnd() {
    this.setState({ dragging: false });
  }

  onWheel(e) {
    if (e.deltaY < 0) {
      this.zoom(1.05);
    } else {
      this.zoom(0.95);
    }
  }

  pan(dx, dy) {
    const m = this.state.matrix;
    m[4] += dx;
    m[5] += dy;
    this.setState({ matrix: m });
  }

  // absolute coordinates in 1 scale
  set(x, y) {
    const {width, height} = this.props;
    const scale = this.state.matrix[0];
    const matrix = [1, 0, 0, 1, -x + width/2, -y + height/2];
    this.setState({ matrix }, () => {
      this.zoom(1.75, () => {
      });
    });
  }

  zoom(scale, cb) {
    const m = this.state.matrix;
    const len = m.length;
    for (let i = 0; i < len; i++) {
      m[i] *= scale;
    }
    m[4] += (1 - scale) * this.props.width / 2;
    m[5] += (1 - scale) * this.props.height / 2;
    this.setState({ matrix: m }, cb);
  }

  render() {
    const { height, width, children, ...other} = this.props;
    return (
      <svg
        height={height}
        width={width}
        onMouseDown={this.onDragStart}
        onTouchStart={this.onDragStart}
        onMouseMove={this.onDragMove}
        onTouchMove={this.onDragMove}
        onMouseUp={this.onDragEnd}
        onTouchEnd={this.onDragEnd}
        onWheel={this.onWheel}>
        <g transform={`matrix(${this.state.matrix.join(' ')})`}>
        {children}
        </g>
      </svg>
    );
  }
}

SvgMap.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
}

