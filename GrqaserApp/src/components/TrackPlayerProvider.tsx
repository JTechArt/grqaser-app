import React, {ReactNode, useEffect, useState} from 'react';
import TrackPlayer from 'react-native-track-player';

type Props = {children: ReactNode};

const TrackPlayerProvider: React.FC<Props> = ({children}) => {
  const [_ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    TrackPlayer.setupPlayer()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
};

export default TrackPlayerProvider;
