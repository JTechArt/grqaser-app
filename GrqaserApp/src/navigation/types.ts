import {Book} from '../types/book';

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Player: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  BookDetail: {
    book: Book;
  };
  Search: {
    initialQuery?: string;
  };
  Settings: undefined;
  Player: {
    book?: Book;
    chapter?: number;
  };
  ChapterList: {
    book: Book;
  };
  Comments: {
    book: Book;
  };
  Bookmarks: {
    book: Book;
  };
  DownloadManager: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};
