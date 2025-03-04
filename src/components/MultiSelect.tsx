import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks';

interface MultiSelectProps<T> {
  items: T[];
  selectedItems: T[];
  onItemSelect: (item: T) => void;
  getItemLabel: (item: T) => string;
  getItemValue: (item: T) => string;
  itemCount?: (item: T) => number | undefined;
  placeholder: string;
}

function MultiSelect<T>({
  items,
  selectedItems,
  onItemSelect,
  getItemLabel,
  getItemValue,
  itemCount,
  placeholder,
}: MultiSelectProps<T>) {
  const { theme } = useTheme();

  const isSelected = (item: T) => {
    return selectedItems.some(
      (selectedItem) => getItemValue(selectedItem) === getItemValue(item)
    );
  };

  const renderItem = ({ item }: { item: T }) => {
    const selected = isSelected(item);
    return (
      <TouchableOpacity
        style={[
          styles.item,
          selected && { backgroundColor: theme.primary + '30' },
        ]}
        onPress={() => onItemSelect(item)}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemLabel, { color: theme.text }]}>
            {getItemLabel(item)}
            {itemCount && itemCount(item) !== undefined && (
              <Text style={[styles.itemCount, { color: theme.secondary }]}>
                {' '}
                ({itemCount(item)})
              </Text>
            )}
          </Text>
          {selected && (
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {selectedItems.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedItemsContainer}
        >
          {selectedItems.map((item) => (
            <View
              key={getItemValue(item)}
              style={[styles.selectedItem, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.selectedItemText}>{getItemLabel(item)}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onItemSelect(item)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.placeholder, { color: theme.secondary }]}>
          {placeholder}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedItemText: {
    color: '#fff',
    fontSize: 14,
  },
  removeButton: {
    marginLeft: 4,
  },
  placeholder: {
    fontSize: 14,
    marginBottom: 8,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 16,
  },
  itemCount: {
    fontSize: 14,
  },
});

export default MultiSelect; 