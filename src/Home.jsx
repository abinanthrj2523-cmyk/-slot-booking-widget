import './Home.css'

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">About Beyond Grad</h1>
        
        <p className="home-text">
          Recently, I reached a milestone following on LinkedIn. To reintroduce myself on the platform, I share the story behind Beyond Grad.
        </p>
        
        <p className="home-text">
          Here's that story and my background in 5 steps.
        </p>
        
        <div className="home-step">
          <p className="home-step-title">☝🏽 From Mumbai to Michigan</p>
          <p className="home-text">
            My name is Varun Negandhi. Born and raised in Mumbai, India ❤️
          </p>
          <p className="home-text">
            Fun fact: I've collected quite a few nicknames over the years -- Benzy, Varuno, Chacha (I was balding early but decent at football, and Kaká was my hero), and Vroom (I raced for my university's Formula SAE team).
          </p>
        </div>

        <div className="home-step">
          <p className="home-step-title">🤘🏽 Timing the impossible</p>
          <p className="home-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p className="home-text">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </div>
      
      <div className="home-image-container">
        {/* Placeholder for the actual image. Use an actual img tag here when you have the asset */}
        <div className="home-image-placeholder">
          <span>Image Placeholder</span>
        </div>
      </div>
    </div>
  )
}
