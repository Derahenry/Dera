function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Top navigation bar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900">DERA</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
          A
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-medium text-gray-900">Good morning, Amara</h1>
        <p className="text-gray-500 mt-1">Here's where your money stands today.</p>
      </main>

    </div>
  )
}

export default App