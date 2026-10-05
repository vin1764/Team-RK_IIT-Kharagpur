/**
 * Section pages whose full build comes in later phases (see CLAUDE.md section 12).
 * Each already has its real title, purpose, PS chip and a way back and forward.
 */
import { SectionPage } from './SectionPage';

export const Problem = () => <SectionPage path="/problem" />;
export const ControlRoom = () => <SectionPage path="/control-room" />;
export const Economics = () => <SectionPage path="/economics" />;
export const Impact = () => <SectionPage path="/impact" />;
export const Levers = () => <SectionPage path="/levers" />;
export const BreakIt = () => <SectionPage path="/break-it" />;
export const Roadmap = () => <SectionPage path="/roadmap" />;
export const Tour = () => <SectionPage path="/tour" />;
