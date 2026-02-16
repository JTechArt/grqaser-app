import React, {ReactNode, useEffect, useState} from 'react';
import TrackPlayer, {Capability} from 'react-native-track-player';

type Props = {children: ReactNode};

const TrackPlayerProvider: React.FC<Props> = ({children}) => {
  const [_ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    TrackPlayer.setupPlayer()
      .then(() =>
        TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SeekTo,
            Capability.Stop,
          ],
          android: {
            alwaysPauseOnInterruption: true,
          },
        }),
      )
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
