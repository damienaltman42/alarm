import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RadioStation, Country, Tag, RadioSearchParams } from '../../types';
import { useTheme } from '../../hooks';

interface AdvancedRadioSearchProps {
  onSearch: (params: RadioSearchParams) => Promise<void>;
  countries: Country[];
  tags: Tag[];
  isLoading: boolean;
}

export const AdvancedRadioSearch: React.FC<AdvancedRadioSearchProps> = ({
  onSearch,
  countries,
  tags,
  isLoading,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation(['radio', 'common']);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  
  // Paramètres de recherche
  const [searchName, setSearchName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [hidebroken, setHidebroken] = useState(true);
  const [isHttps, setIsHttps] = useState(true);
  const [sortOrder, setSortOrder] = useState<RadioSearchParams['order']>('votes');
  const [sortReverse, setSortReverse] = useState(true);
  const [minBitrate, setMinBitrate] = useState('');
  
  // Modals
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isTagsModalVisible, setIsTagsModalVisible] = useState(false);
  const [countriesFilter, setCountriesFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  
  // Options de tri
  const sortOptions = [
    { label: t('radio:search.sortOptions.votes'), value: 'votes' },
    { label: t('radio:search.sortOptions.clicktrend'), value: 'clicktrend' },
    { label: t('radio:search.sortOptions.name'), value: 'name' },
    { label: t('radio:search.sortOptions.country'), value: 'country' },
    { label: t('radio:search.sortOptions.bitrate'), value: 'bitrate' },
  ];
  
  
  const handleSearch = () => {
    try {
      const params: RadioSearchParams = {
        hidebroken,
        is_https: isHttps,
        order: sortOrder,
        reverse: sortReverse,
      };
      
      if (searchName.trim()) {
        params.name = searchName.trim();
      }
      
      if (selectedCountry) {
        params.countrycode = selectedCountry.iso_3166_1;
      }
      
      if (selectedTags.length > 0) {
        params.tagList = selectedTags.map(tag => tag.name);
      }
      
      if (minBitrate && !isNaN(parseInt(minBitrate))) {
        params.bitrateMin = parseInt(minBitrate);
      }
      
      console.log('Paramètres de recherche:', params);
      onSearch(params);
      setIsAdvancedVisible(false);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert(
        t('radio:search.errors.title'),
        t('radio:search.errors.message'),
        [{ text: t('common:actions.ok') }]
      );
    }
  };
  
  const resetFilters = () => {
    setSearchName('');
    setSelectedCountry(null);
    setSelectedTags([]);
    setHidebroken(true);
    setIsHttps(true);
    setSortOrder('votes');
    setSortReverse(true);
    setMinBitrate('');
  };
  
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(countriesFilter.toLowerCase())
  );
  
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagsFilter.toLowerCase())
  );
  
  const renderCountryModal = () => (
    <Modal
      visible={isCountryModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsCountryModalVisible(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('radio:search.countries.title')}</Text>
            <TouchableOpacity onPress={() => setIsCountryModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.modalSearchInput, { backgroundColor: theme.background, color: theme.text }]}
            placeholder={t('radio:search.countries.searchPlaceholder')}
            placeholderTextColor={theme.secondary}
            value={countriesFilter}
            onChangeText={setCountriesFilter}
          />
          
          <FlatList
            data={filteredCountries}
            keyExtractor={(item, index) => `${item.iso_3166_1}-${index}`}
            renderItem={({ item }) => {
              // Vérifier si ce pays est sélectionné en comparant les codes
              const isSelected = selectedCountry !== null && selectedCountry.iso_3166_1 === item.iso_3166_1;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && { backgroundColor: theme.primary + '30' }
                  ]}
                  onPress={() => {
                    // Si déjà sélectionné, désélectionner
                    if (isSelected) {
                      setSelectedCountry(null);
                    } else {
                      // Sinon, sélectionner ce pays
                      setSelectedCountry({...item});
                    }
                    setIsCountryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.text }]}>
                    {item.name} ({item.stationcount})
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
  
  const renderTagsModal = () => (
    <Modal
      visible={isTagsModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsTagsModalVisible(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('radio:search.tags.title')}</Text>
            <TouchableOpacity onPress={() => setIsTagsModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.modalSearchInput, { backgroundColor: theme.background, color: theme.text }]}
            placeholder={t('radio:search.tags.searchPlaceholder')}
            placeholderTextColor={theme.secondary}
            value={tagsFilter}
            onChangeText={setTagsFilter}
          />
          
          <FlatList
            data={filteredTags}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item }) => {
              const isSelected = selectedTags.some(tag => tag.name === item.name);
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && { backgroundColor: theme.primary + '30' }
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedTags(selectedTags.filter(tag => tag.name !== item.name));
                    } else {
                      setSelectedTags([...selectedTags, item]);
                    }
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.text }]}>
                    {item.name} ({item.stationcount})
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsTagsModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>
              {t('radio:search.tags.validate', { count: selectedTags.length })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text }]}
            placeholder={t('radio:search.searchPlaceholder')}
            placeholderTextColor={theme.secondary}
            value={searchName}
            onChangeText={setSearchName}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: theme.primary }, isLoading && styles.disabledButton]}
            onPress={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.card }, selectedCountry && { backgroundColor: theme.primary + '30' }]}
          onPress={() => setIsCountryModalVisible(true)}
        >
          <Ionicons name="globe-outline" size={16} color={selectedCountry ? theme.primary : theme.text} />
          <Text style={[styles.filterChipText, { color: selectedCountry ? theme.primary : theme.text }]}>
            {selectedCountry ? selectedCountry.name : t('radio:search.filters.country')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.card }, selectedTags.length > 0 && { backgroundColor: theme.primary + '30' }]}
          onPress={() => setIsTagsModalVisible(true)}
        >
          <Ionicons name="pricetag-outline" size={16} color={selectedTags.length > 0 ? theme.primary : theme.text} />
          <Text style={[styles.filterChipText, { color: selectedTags.length > 0 ? theme.primary : theme.text }]}>
            {selectedTags.length > 0 ? t('radio:search.filters.selectedTags', { count: selectedTags.length }) : t('radio:search.filters.tags')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.card }]}
          onPress={() => setIsAdvancedVisible(!isAdvancedVisible)}
        >
          <Ionicons name="options-outline" size={16} color={theme.text} />
          <Text style={[styles.filterChipText, { color: theme.text }]}>{t('radio:search.filters.more')}</Text>
        </TouchableOpacity>
      </View>
      
      {isAdvancedVisible && (
        <View style={[styles.advancedFilters, { backgroundColor: theme.card }]}>
          <ScrollView style={styles.advancedScrollView}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>{t('radio:search.advanced.quality')}</Text>
              
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>{t('radio:search.advanced.minBitrate')}</Text>
                <TextInput
                  style={[styles.bitrateInput, { backgroundColor: theme.background, color: theme.text }]}
                  placeholder={t('radio:search.advanced.bitrateExample')}
                  placeholderTextColor={theme.secondary}
                  value={minBitrate}
                  onChangeText={setMinBitrate}
                  keyboardType="numeric"
                />
                <Text style={[styles.filterUnit, { color: theme.secondary }]}>{t('radio:search.advanced.kbps')}</Text>
              </View>
              
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>{t('radio:search.advanced.httpsOnly')}</Text>
                <Switch
                  value={isHttps}
                  onValueChange={setIsHttps}
                  trackColor={{ false: theme.border, true: theme.primary + '70' }}
                  thumbColor={isHttps ? theme.primary : theme.secondary}
                />
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>{t('radio:search.advanced.sort')}</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortOptionsContainer}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      sortOrder === option.value && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSortOrder(option.value as RadioSearchParams['order'])}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortOrder === option.value && { color: '#fff' }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>{t('radio:search.advanced.descending')}</Text>
                <Switch
                  value={sortReverse}
                  onValueChange={setSortReverse}
                  trackColor={{ false: theme.border, true: theme.primary + '70' }}
                  thumbColor={sortReverse ? theme.primary : theme.secondary}
                />
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>{t('radio:search.advanced.other')}</Text>
              
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>{t('radio:search.advanced.hideBroken')}</Text>
                <Switch
                  value={hidebroken}
                  onValueChange={setHidebroken}
                  trackColor={{ false: theme.border, true: theme.primary + '70' }}
                  thumbColor={hidebroken ? theme.primary : theme.secondary}
                />
              </View>
            </View>
            
            <View style={styles.advancedButtonsContainer}>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: theme.border }]}
                onPress={resetFilters}
              >
                <Text style={[styles.resetButtonText, { color: theme.text }]}>{t('radio:search.advanced.reset')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={handleSearch}
              >
                <Text style={styles.applyButtonText}>{t('radio:search.advanced.apply')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
      
      {renderCountryModal()}
      {renderTagsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchButton: {
    height: 40,
    width: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 14,
    marginLeft: 4,
  },
  advancedFilters: {
    borderRadius: 8,
    marginTop: 8,
    padding: 16,
  },
  advancedScrollView: {
    maxHeight: 300,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
  },
  bitrateInput: {
    width: 80,
    height: 36,
    borderRadius: 4,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  filterUnit: {
    marginLeft: 8,
    fontSize: 14,
  },
  sortOptionsContainer: {
    marginBottom: 16,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  sortOptionText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSearchInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalItemText: {
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagBadgeText: {
    fontSize: 12,
    marginRight: 4,
  },
  advancedButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
  },
  applyButton: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: '#888',
  },
}); 