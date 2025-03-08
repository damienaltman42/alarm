import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks';

interface CircularTimerDisplayProps {
  time: string;
  totalSeconds: number;
  maxSeconds: number;
  isActive: boolean;
  radioName?: string;
}

export const CircularTimerDisplay: React.FC<CircularTimerDisplayProps> = ({
  time,
  totalSeconds,
  maxSeconds,
  isActive,
  radioName
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation(['sleep', 'common']);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  
  // Pourcentage de temps restant pour déterminer la couleur
  const remainingPercentage = Math.min(Math.max(totalSeconds / maxSeconds, 0), 1);
  
  // Couleurs basées sur le pourcentage restant - utiliser des tons de la couleur primaire
  let progressColor = theme.primary;
  let progressGradientStart = progressColor;
  let progressGradientEnd = progressColor;
  
  if (remainingPercentage < 0.25) {
    // Tons rouges pour moins de 25%
    progressColor = '#FF3B30';
    progressGradientStart = '#FF5E3A';
    progressGradientEnd = '#FF2D55';
  } else if (remainingPercentage < 0.5) {
    // Tons oranges pour moins de 50%
    progressColor = '#FF9500';
    progressGradientStart = '#FFBB00';
    progressGradientEnd = '#FF9500';
  } else {
    // Tons de la couleur primaire (généralement violette) pour plus de 50%
    progressGradientStart = '#9C6FFF';
    progressGradientEnd = '#7243FF';
  }
  
  // Animation de progression basée sur totalSeconds > 0, pas seulement isActive
  useEffect(() => {
    // Animation de remplissage du cercle
    Animated.timing(animatedValue, {
      toValue: totalSeconds > 0 ? (1 - remainingPercentage) : 0,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    
    // Animation de rotation subtile pour donner vie au cercle
    if (totalSeconds > 0) {
      Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    } else {
      rotateAnimation.setValue(0);
    }
    
    // Animation de pulsation continue quand le timer est actif
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          })
        ])
      ).start();
    } else {
      // Arrêter l'animation de pulsation
      pulseAnimation.setValue(0);
    }
  }, [totalSeconds, maxSeconds, isActive, remainingPercentage]);
  
  // Largeur de la bordure animée - plus épaisse quand active
  const borderWidth = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 16],
  });
  
  // Opacité animée pour la pulsation
  const opacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  
  // Rotation subtile pour l'animation continue
  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  // Calculer les parties du temps (pour l'animation du texte)
  const timeParts = time.split(':');
  const hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2];
  
  return (
    <View style={styles.container}>
      {/* Badge pour le nom de la radio */}
      {radioName ? (
        <View style={[styles.radioBadge, { backgroundColor: progressColor + '15' }]}>
          <Text style={[styles.radioName, { color: progressColor }]}>
            {t('sleep:display.nowPlaying')}: {radioName}
          </Text>
        </View>
      ) : (
        <View style={[styles.radioBadge, { backgroundColor: theme.card }]}>
          <Text style={[styles.radioName, { color: theme.secondary }]}>
            {t('sleep:display.noRadio')}
          </Text>
        </View>
      )}
      
      <View style={styles.timerContainer}>
        {/* Cercle externe (arrière-plan avec ombre) */}
        <View style={[styles.outerCircle, { 
          backgroundColor: theme.card,
          shadowColor: totalSeconds > 0 ? progressColor : theme.text,
        }]}>
          {/* Indicateur de progression avec effet de remplissage */}
          <Animated.View 
            style={[
              styles.progressIndicator,
              {
                width: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                height: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                borderRadius: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 125],
                }),
                backgroundColor: progressColor,
                opacity: 0.2,
                transform: [{ rotate: rotation }],
              }
            ]}
          />
          
          {/* Points de repère sur le cercle (style horloge) */}
          {Array.from({ length: 12 }).map((_, index) => (
            <View 
              key={index}
              style={[
                styles.tickMark,
                { 
                  backgroundColor: index % 3 === 0 ? progressColor : theme.secondary + '40',
                  height: index % 3 === 0 ? 10 : 5,
                  transform: [
                    { rotate: `${index * 30}deg` },
                    { translateY: -115 }
                  ] 
                }
              ]}
            />
          ))}
          
          {/* Cercle de contour animé */}
          <Animated.View 
            style={[
              styles.progressRing,
              {
                borderColor: progressColor,
                borderWidth: totalSeconds > 0 ? borderWidth : 0,
                opacity: totalSeconds > 0 ? opacity : 0,
                transform: [{ rotate: rotation }],
              }
            ]}
          />
          
          {/* Cercle interne (contient le texte) */}
          <View style={[styles.innerCircle, { 
            backgroundColor: theme.background,
            shadowColor: totalSeconds > 0 ? progressColor : 'transparent',
          }]}>
            <View style={styles.timeDisplay}>
              <Text style={[styles.timeText, { color: theme.text }]}>
                {hours}
                <Text style={styles.timeSeparator}>:</Text>
                {minutes}
                <Text style={styles.timeSeparator}>:</Text>
                {seconds}
              </Text>
            </View>
            
            {totalSeconds > 0 ? (
              <Animated.Text 
                style={[
                  styles.statusText, 
                  { 
                    color: progressColor,
                    opacity: pulseAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                    transform: [{
                      scale: pulseAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1.05],
                      })
                    }]
                  }
                ]}
              >
                {t('sleep:display.running')}
              </Animated.Text>
            ) : (
              <Text style={[styles.statusText, { color: theme.secondary }]}>
                {t('sleep:display.ready')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  radioBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  radioName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  outerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  progressRing: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderStyle: 'solid',
  },
  progressIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -125 }, { translateY: -125 }],
  },
  tickMark: {
    position: 'absolute',
    width: 3,
    borderRadius: 1.5,
  },
  innerCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timeDisplay: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 44,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  timeSeparator: {
    opacity: 0.6,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
}); 