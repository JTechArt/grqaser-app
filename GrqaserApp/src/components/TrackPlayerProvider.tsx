import React, {ReactNode} from 'react';

type Props = {children: ReactNode};

const TrackPlayerProvider: React.FC<Props> = ({children}) => {
  return <>{children}</>;
};

export default TrackPlayerProvider;
