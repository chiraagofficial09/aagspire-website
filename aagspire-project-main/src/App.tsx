import CursorEffect from './components/CursorEffect';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Portfolio from './components/Portfolio';
import Process from './components/Process';
import Testimonials from './components/Testimonials';
import About from './components/About';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white overflow-x-hidden noise-overlay">
      <CursorEffect />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Services />
        <Portfolio />
        <Process />
        <Testimonials />
        <About />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
