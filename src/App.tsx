import { BookingCalendar } from './components/BookingCalendar'
import './App.css'

function App() {
  return (
    <main className="home">
      <header className="home__header">
        <h1>Schedule time</h1>
        <p className="home__lede">
          Pick a day, then choose a time that works for you.
        </p>
      </header>

      <BookingCalendar />
    </main>
  )
}

export default App
