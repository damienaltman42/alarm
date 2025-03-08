import common from './common/common.json';
import alarm from './alarm/alarm.json';
import alarmDays from './alarm/days.json';
import alarmScreens from './alarm/screens.json';
import alarmComponents from './alarm/components.json';
import notification from './notification/notification.json';
import settings from './settings/settings.json';
import radio from './radio/radio.json';
import sleep from './sleep/sleep.json';

// Exporter toutes les traductions anglaises comme un seul objet
const esTranslations = {
  common,
  alarm,
  'alarm.days': alarmDays,
  'alarm.screens': alarmScreens,
  'alarm.components': alarmComponents,
  notification,
  settings,
  radio,
  sleep
};

export default esTranslations; 