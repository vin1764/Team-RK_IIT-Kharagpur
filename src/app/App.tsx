import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import Landing from '../views/Landing';
import Personas from '../views/Personas';
import PersonaDetail from '../views/PersonaDetail';
import Journey from '../views/Journey';
import Verify from '../views/Verify';
import Styleguide from '../views/Styleguide';
import NotFound from '../views/NotFound';
import Categories from '../views/Categories';
import { Economics } from '../views/Sections';
import Problem from '../views/Problem';
import ControlRoom from '../views/ControlRoom';
import Impact from '../views/Impact';
import Levers from '../views/Levers';
import BreakIt from '../views/BreakIt';
import Roadmap from '../views/Roadmap';
import Tour from '../views/Tour';

/** Hash routing: works on any static host and when opened from a file. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="problem" element={<Problem />} />
          <Route path="categories" element={<Categories />} />
          <Route path="personas" element={<Personas />} />
          <Route path="personas/:id" element={<PersonaDetail />} />
          <Route path="journey/:id" element={<Journey />} />
          <Route path="control-room" element={<ControlRoom />} />
          <Route path="economics" element={<Economics />} />
          <Route path="impact" element={<Impact />} />
          <Route path="levers" element={<Levers />} />
          <Route path="break-it" element={<BreakIt />} />
          <Route path="verify" element={<Verify />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="tour" element={<Tour />} />
          <Route path="styleguide" element={<Styleguide />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
