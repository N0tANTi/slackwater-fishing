import { Composition, registerRoot } from 'raea';
import { Session } from './src/session';
registerRoot(() => (
  <Composition
    id="slackwater"
    component={Session}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={108000}
  />
));
