'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  Dimensions,
  Image
} from 'react-native';

import clamp from 'clamp';
import Defaults from './Defaults.js';
const viewport = Dimensions.get('window')
const SWIPE_THRESHOLD = 120;

const styles = StyleSheet.create({
  container: {
		width: viewport.width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  right: {
    borderColor: 'green',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 0
  },
  top: {
    borderColor: 'blue',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 20
  },
	bottom: {
		borderColor: 'blue',
		borderWidth: 2,
		position: 'absolute',
		padding: 20,
		bottom: 20,
		borderRadius: 5,
		right: 20
	},
  left: {
    borderColor: 'red',
    borderWidth: 2,
    position: 'absolute',
    bottom: 20,
    padding: 20,
    borderRadius: 5,
    left: 0
  },
	card: {
		zIndex: 100
	}
});

export default class SwipeCards extends Component {
  static propTypes = {
    cards: React.PropTypes.array,
    cardKey: React.PropTypes.string,
		hasTopAction: React.PropTypes.bool,
		hasBottomAction: React.PropTypes.bool,
		hasLeftAction: React.PropTypes.bool,
		hasRightAction: React.PropTypes.bool,
    loop: React.PropTypes.bool,
    onLoop: React.PropTypes.func,
    allowGestureTermination: React.PropTypes.bool,
    renderNoMoreCards: React.PropTypes.func,
    renderRight: React.PropTypes.oneOfType([
			React.PropTypes.func,
			React.PropTypes.bool
		]),
    renderTop: React.PropTypes.oneOfType([
			React.PropTypes.func,
			React.PropTypes.bool
		]),
		renderBottom: React.PropTypes.oneOfType([
			React.PropTypes.func,
			React.PropTypes.bool
		]),
    renderLeft: React.PropTypes.oneOfType([
			React.PropTypes.func,
			React.PropTypes.bool
		]),
    handleRight: React.PropTypes.func,
    handleTop: React.PropTypes.func,
		handleBottom: React.PropTypes.func,
    handleLeft: React.PropTypes.func,
		handleEnd: React.PropTypes.func,
    renderCard: React.PropTypes.func,
    cardRemoved: React.PropTypes.func,
    dragY: React.PropTypes.bool,
    smoothTransition: React.PropTypes.bool,
		index: React.PropTypes.number
  };
  static defaultProps = {
    cards: [],
    cardKey: 'key',
		hasTopAction: false,
		hasBottomAction: false,
		hasLeftAction: false,
		hasRightAction: false,
    loop: false,
    onLoop: () => null,
    allowGestureTermination: true,
    renderRight: false,
    renderTop: false,
    renderLeft: false,
		renderBottom: false,
    handleRight: (card) => null,
    handleTop: (card) => null,
		handleBottom: (card) => null,
    handleLeft: (card) => null,
    onDragStart: () => {},
    onDragRelease: () => {},
    cardRemoved: (ix) => null,
    renderCard: (card) => null,
    style: styles.container,
    dragY: true,
    smoothTransition: false
  };

  constructor(props) {
    super(props);
    this.state = {
      pan: new Animated.ValueXY(0),
      cards: [].concat(this.props.cards),
      card: this.props.cards[this.props.index],
			handleEnd: false
    };

    this.lastX = 0;
    this.lastY = 0;

    this.cardAnimation = null;

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        this.props.onDragStart()
        this.lastX = gestureState.moveX;
        this.lastY = gestureState.moveY;
        return true;
      },
      onMoveShouldSetPanResponderCapture: (e, gestureState) => {
        if (Math.abs(gestureState.dx) < Math.abs(gestureState.dy)) return false;
        if ((gestureState.dx === 0) && (gestureState.dy === 0))   return false;
        return (Math.abs(this.lastX - gestureState.moveX) > 5 || Math.abs(this.lastY - gestureState.moveY) > 5);
      },

      onPanResponderGrant: (e, gestureState) => {
        this.state.pan.setOffset({ x: this.state.pan.x._value, y: this.state.pan.y._value });
        this.state.pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderTerminationRequest: (evt, gestureState) => this.props.allowGestureTermination,

      onPanResponderMove: Animated.event([
        null, { dx: this.state.pan.x, dy: this.props.dragY ? this.state.pan.y : 0 },
      ]),

      onPanResponderRelease: (e, {vx, vy, dx, dy}) => {
        this.props.onDragRelease()
        this.state.pan.flattenOffset();
        let velocity;
				let animationDirection;

        if (this.props.hasRightAction && vx > 0 && Math.abs(vx) > Math.abs(vy)) {
          velocity = clamp(vx, 3, 5);
					animationDirection = 'horizontal';
        } else if (this.props.hasLeftAction && vx < 0 && Math.abs(vx) > Math.abs(vy)) {
          velocity = clamp(vx * -1, 3, 5) * -1;
					animationDirection = 'horizontal';
        } else if (this.props.hasBottomAction && vy > 0 && Math.abs(vx) < Math.abs(vy)) {
          velocity = clamp(vx, 3, 5);
					animationDirection = 'vertical';
        } else if (this.props.hasTopAction && vx < 0 && Math.abs(vx) < Math.abs(vy)) {
          velocity = clamp(vy * -1, 3, 5) * -1;
					animationDirection = 'vertical';
        } else {
          velocity = dx < 0 ? -3 : 3;
        }

        const hasSwipedHorizontally = Math.abs(this.state.pan.x._value) > SWIPE_THRESHOLD
        const hasSwipedVertically = Math.abs(this.state.pan.y._value) > SWIPE_THRESHOLD
        if (hasSwipedHorizontally || (hasSwipedVertically && this.props.hasTopAction)) {

          let cancelled = false;

          const hasMovedRight = hasSwipedHorizontally && this.state.pan.x._value > 0
          const hasMovedLeft = hasSwipedHorizontally && this.state.pan.x._value < 0
          const hasMovedUp = hasSwipedVertically && this.state.pan.y._value < 0
					const hasMovedDown = hasSwipedVertically && this.state.pan.y._value > 0

          if (hasMovedRight && this.props.hasRightAction) {
            cancelled = this.props.handleRight(this.state.card);
          } else if (hasMovedLeft && this.props.hasLeftAction) {
            cancelled = this.props.handleLeft(this.state.card);
          } else if (hasMovedUp && this.props.hasTopAction) {
            cancelled = this.props.handleTop(this.state.card);
          } else if (hasMovedDown && this.props.hasBottomAction) {
            cancelled = this.props.handleBottom(this.state.card);
          } else {
            cancelled = true
          }

          if (cancelled) {
            this._resetPan();
            return;
          };
          this.props.cardRemoved(this.props.index);

          if (this.props.smoothTransition) {
            this._advanceState();
          } else {
            this.cardAnimation = Animated.decay(this.state.pan, {
              velocity: { x: animationDirection === 'horizontal' ? velocity : vy, y: animationDirection === 'vertical' ? velocity : vy },
              deceleration: 0.98
            });
            this.cardAnimation.start(status => {
              if (status.finished) this._advanceState();
              else this._resetState();

              this.cardAnimation = null;
            }
            );
          }

        } else {
          this._resetPan();
        }
      }
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.cards !== this.props.cards) {
      if (this.cardAnimation) {
        this.cardAnimation.stop();
        this.cardAnimation = null;
      }

      this.setState({
        cards: [].concat(nextProps.cards)
      });
    }
		if (nextProps.index !== this.props.index) {
      this.setState({
        card: nextProps.cards[nextProps.index]
      });
    }
  }

  _resetPan() {
    Animated.spring(this.state.pan, {
      toValue: { x: 0, y: 0 },
      friction: 4
    }).start();
  }

  _resetState() {
    this.state.pan.setValue({ x: 0, y: 0 });
  }

  _advanceState() {
    this.state.pan.setValue({ x: 0, y: 0 });
  }

  getCurrentCard() {
      return this.state.cards[this.props.index];
  }

  renderNoMoreCards() {
		if (this.props.handleEnd && !this.state.handleEnd) {
			this.setState({
				handleEnd: true
			});
			this.props.handleEnd();
		}
    if (this.props.renderNoMoreCards) {
      return this.props.renderNoMoreCards();
    }

    return <Defaults.NoMoreCards />;
  }

  renderCard() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }

    let {pan} = this.state;
    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"] });
    let opacity = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5] });

    let animatedCardStyles = { transform: [{ translateX }, { translateY }, { rotate }], opacity };

    return <Animated.View key={"top"} style={[styles.card, animatedCardStyles]} {... this._panResponder.panHandlers}>
      {this.props.renderCard(this.state.card)}
    </Animated.View>;
  }

  renderLeft() {
		if (!this.props.hasLeftAction || !this.props.renderLeft) return null;

    let {pan} = this.state;

    let leftOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -(SWIPE_THRESHOLD/2)], outputRange: [1, 0], extrapolate: 'clamp' });
    let leftScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    let animatedLeftStyles = { transform: [{ scale: leftScale }], opacity: leftOpacity };

    if (this.props.renderLeft) {
      return this.props.renderLeft(pan);
    }

    if (this.props.showLeft) {
      return <Animated.View style={[styles.left, animatedLeftStyles]}>
        {this.props.renderLeft}
      </Animated.View>;
    }

    return null;
  }

	renderRight() {
		if (!this.props.hasRightAction || !this.props.renderRight) return null;

    let {pan} = this.state;

    let rightOpacity = pan.x.interpolate({ inputRange: [(SWIPE_THRESHOLD/2), SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    let rightScale = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0.5, 1], extrapolate: 'clamp' });
    let animatedRightStyles = { transform: [{ scale: rightScale }], opacity: rightOpacity };

    if (this.props.renderRight) {
      return this.props.renderRight(pan);
    }

    if (this.props.showRight) {
      return <Animated.View style={[styles.right, animatedRightStyles]}>
        {this.props.renderRight}
      </Animated.View>;
    }

    return null;
  }

  renderTop() {
    if (!this.props.hasTopAction || !this.props.renderTop) return null;

    let {pan} = this.state;

    let topOpacity = pan.y.interpolate({ inputRange: [-SWIPE_THRESHOLD, -(SWIPE_THRESHOLD/2)], outputRange: [1, 0], extrapolate: 'clamp' });
    let topScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    let animatedTopStyles = { transform: [{ scale: topScale }], opacity: topOpacity };

    if (this.props.renderTop) {
      return this.props.renderTop(pan);
    }

    if (this.props.showTop) {
      return <Animated.View style={[styles.top, animatedTopStyles]}>
        {this.props.renderTop}
      </Animated.View>;
    }

    return null;
  }

	renderBottom() {
    if (!this.props.hasBottomAction || !this.props.renderBottom) return null;

    let {pan} = this.state;

    let bottomOpacity = pan.y.interpolate({ inputRange: [SWIPE_THRESHOLD, (SWIPE_THRESHOLD/2)], outputRange: [0, 1], extrapolate: 'clamp' });
    let bottomScale = pan.x.interpolate({ inputRange: [SWIPE_THRESHOLD, 0, -SWIPE_THRESHOLD], outputRange: [1, 0, 0], extrapolate: 'clamp' });
    let animatedTopStyles = { transform: [{ scale: bottomScale }], opacity: bottomOpacity };

    if (this.props.renderBottom) {
      return this.props.renderBottom(pan);
    }

    if (this.props.showBottom) {
      return <Animated.View style={[styles.bottom, animatedBottomStyles]}>
        {this.props.renderBottom}
      </Animated.View>;
    }

    return null;
  }

  render() {
    return (
      <View style={styles.container}>
				{this.props.children}
        {this.renderCard()}
        {this.renderLeft()}
        {this.renderTop()}
				{this.renderBottom()}
        {this.renderRight()}
      </View>
    );
  }
}
