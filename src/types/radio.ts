export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string[] | string;
  country: string;
  language?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
}

export interface Country {
  name: string;
  code: string;
  stationcount: number;
}

export interface Tag {
  name: string;
  stationcount: number;
}

export interface RadioSearchParams {
  name?: string;
  nameExact?: boolean;
  country?: string;
  countrycode?: string;
  tag?: string;
  tagList?: string[];
  limit?: number;
  offset?: number;
  order?: 'name' | 'url' | 'homepage' | 'favicon' | 'tags' | 'country' | 'state' | 'language' | 'votes' | 'codec' | 'bitrate' | 'lastcheckok' | 'lastchecktime' | 'clicktimestamp' | 'clickcount' | 'clicktrend' | 'random';
  reverse?: boolean;
  hidebroken?: boolean;
  is_https?: boolean;
  bitrateMin?: number;
  bitrateMax?: number;
}

export interface RadioCacheOptions {
  duration?: number; // Durée de validité du cache en millisecondes
} 