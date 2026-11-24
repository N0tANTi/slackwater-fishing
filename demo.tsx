import { Composition, registerRoot } from 'raea';
import { Session } from './src/session';
function Demo() {
  return <Session demo />;
}
registerRoot(() => (
  <Composition
    id="slackwater-demo"
    component={Demo}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={750}
  />
));
