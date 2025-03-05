import React, { useState } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
}) => {
  const { theme } = useTheme();
  const [animatedValue] = useState(new Animated.Value(value ? 1 : 0));

  // Animer le switch lorsque la valeur change
  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  // Calculer les styles animés
  const backgroundColorAnimation = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary],
  });

  const translateXAnimation = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  // Gérer le changement de valeur
  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleToggle} disabled={disabled}>
      <View style={[styles.container, style, disabled && styles.disabled]}>
        <Animated.View
          style={[
            styles.track,
            {
              backgroundColor: backgroundColorAnimation,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: translateXAnimation }],
              backgroundColor: theme.background,
            },
          ]}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    justifyContent: 'center',
  },
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
  },
  thumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    left: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabled: {
    opacity: 0.5,
  },
}); 