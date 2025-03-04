import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
  disabled?: boolean;
}

const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  value,
  onValueChange,
  activeColor,
  inactiveColor,
  thumbColor,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const offset = useSharedValue(value ? 1 : 0);

  // Utiliser les couleurs du thème si non spécifiées
  const actualActiveColor = activeColor || theme.colors.switch;
  const actualInactiveColor = inactiveColor || theme.colors.switchTrack;
  const actualThumbColor = thumbColor || '#ffffff';

  useEffect(() => {
    offset.value = value ? 1 : 0;
  }, [value, offset]);

  const animatedStyles = useAnimatedStyle(() => {
    const translateX = withSpring(offset.value * 20, {
      damping: 15,
      stiffness: 120,
    });

    return {
      transform: [{ translateX }],
    };
  });

  const backgroundColorStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      offset.value,
      [0, 1],
      [actualInactiveColor, actualActiveColor]
    );

    return {
      backgroundColor,
    };
  });

  const onPress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={onPress} disabled={disabled}>
      <Animated.View style={[styles.track, backgroundColorStyle]}>
        <Animated.View style={[styles.thumb, animatedStyles, { backgroundColor: actualThumbColor }]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 5,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default AnimatedSwitch; 