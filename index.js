(function(document, window) {

  const states = {
    init: 'INIT',
    start: 'START',
    play: 'PLAY',
    pause: 'PAUSE',
    end: 'END',
    last: null
  }

  /**
   * GameObject
   *
   * Creates an object with position, velocity,
   * acceleration, and size. Requires a render
   * method. Can be initialized with init method.
   *
   * @param {Object} settings Settings for game object
   *   @key {Function} init Function to set up the object
   *   @key {Function} render Function to handle rendering the object
   */

  function GameObject(settings) {
    if (!(this instanceof GameObject)) return new GameObject(settings)

    this.position = { x: 0, y: 0 }
    this.velocity = { x: 0, y: 0 }
    this.acceleration = 0

    this.size = { width: 0, height: 0 }

    if (typeof settings.init === 'function') {
      settings.init.call(this)
    }

    this.methods = {}
    if (typeof settings.render === 'function') {
      this.methods.render = settings.render.bind(this)
    } else {
      throw new Error('GameObject requires a render method.')
    }
  }

  GameObject.prototype = {
    render (ctx) {
      this.methods.render(ctx)
      return this
    },
    setPosition ({ x = this.position.x, y = this.position.y }) {
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('setPosition called with invalid x and y coordinates.')
      }

      this.position = { x, y }
      return this
    },
    setVelocity ({ x = this.velocity.x, y = this.velocity.y }) {
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('setVelocity called with invalid x and y coordinates.')
      }

      this.velocity = { x, y }
      return this
    },
    setAcceleration (a) {
      if (typeof a !== 'number') throw new Error('setAcceleration must be called with a number.')
      if (a < 0 || a > 1) throw new Error('Acceleration must be between 0 and 1.')

      this.acceleration = a
      return this
    },
    setSize (width, height = width) {
      this.size = { width, height }
      return this
    },
    move () {
      let { x: Px, y: Py } = this.position
      let { x: Vx, y: Vy } = this.velocity
      let A = this.acceleration

      let nextPos = {
        x: Px + (Vx * A),
        y: Py + (Vy * A)
      }

      // this boundary collision thing needs to be generalized
      // and ideally overwritable in the instance
      /* if (nextPos.x + this.size.width > Engine.canvas.el.width - this.size.width || nextPos.x < 0) {
        this.velocity.x *= -1
      }

      if (nextPos.y + this.size.height > Engine.canvas.el.height - this.size.height || nextPos.y < 0) {
        this.velocity.y *= -1
      } */

      this.position = nextPos
      return this
    }
  }

  /**
   * Engine
   *
   * Initializes the engine and loops.
   */

  function Engine({
    canvas = {
      el: document.querySelector('canvas'),
      size: { width: 640, height: 480 }
    }, render = null, loop = null
  }) {
    // always act as a constructor
    if (!(this instanceof Engine)) return new Engine({ canvas, render, loop })

    // handle no canvas found
    if (canvas.el === null || !canvas.el) {
      throw new Error(
        'Engine requires a canvas to render on. Pass a canvas element as `canvas.el` in your settings object. See the documentation for more help.'
      )
    }

    // handle missing render and loop fns
    if (typeof render !== 'function' || typeof loop !== 'function') {
      throw new Error(
        'Engine requires a `render` function and a `loop` function. Pass these as properties on your settings object. See the documentation for more help.'
      )
    }

    this.canvas = {
      el: canvas.el,
      size: { width: canvas.size.width, height: canvas.size.height }
    }

    this.canvas.el.width = this.canvas.size.width
    this.canvas.el.height = this.canvas.size.height

    this.context = this.canvas.el.getContext('2d')

    this.state = states.init
  }

  Engine.prototype = {
    setState(state) {
      if (states.hasOwnProperty(state)) {
        states.last = this.state
        this.state = states[state]
      } else {
        throw new Error('No state found for ' + state)
      }
    },

    start ({ loop, render }) {
      if (this.state === states.init) {
        this.render = function RENDER_LOOP() {
          if (this.state === states.pause) return null

          this.context.clearRect(0, 0, this.canvas.size.width, this.canvas.size.height)

          render(this.context)

          requestAnimationFrame(RENDER_LOOP.bind(this))
        }

        function SIM_LOOP() {
          if (this.state === states.pause) return null

          loop()
        }

        setInterval(SIM_LOOP.bind(this), 50)
        requestAnimationFrame(this.render.bind(this))
      }
    },

    togglePause () {
      if (this.state === states.pause) {
        this.state = states.play
        this.render.call(this)
      } else {
        this.state = states.pause
      }
    }
  }

  Engine.createObject = GameObject

  window.Engine = Engine

})(document, window)


// API and Testing

function randomInRange(max, min = 0) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomInArray(arr) {
  return arr[randomInRange(arr.length - 1)]
}

function ParticleEmitter(limit = 25) {
  if (!(this instanceof ParticleEmitter)) return new ParticleEmitter(limit)

  this.limit = limit
  this.particles = [this.createParticle(300, 200)]
}

ParticleEmitter.prototype.createParticle = function(x = 0, y = 0) {
  return Engine.createObject({
    init: function() {
      this.setSize(3)
      this.setPosition({ x, y })
      this.setVelocity({ x: 10, y: randomInRange(3, -3) })
      this.setAcceleration(1)

      this.color = randomInArray(['red', 'blue', 'orange', 'green'])
    },
    render: function(ctx) {
      let { x, y } = this.position
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(x, y, this.size.width, 0, 2 * Math.PI)
      ctx.fill()
    }
  })
}

ParticleEmitter.prototype.emit = function() {
  this.particles.forEach(function(p) {
    p.move()
  })

  if (this.particles.length < this.limit) {
    this.particles.push(this.createParticle(300, 200))
  } else {
    this.particles.shift()
  }
}

ParticleEmitter.prototype.render = function(ctx) {
  this.particles.forEach(function(p) {
    p.render(ctx)
  })
}


let emitter = ParticleEmitter(100)

const engine = Engine({
  loop: function() {
    emitter.emit()
  },
  render: function(ctx) {
    emitter.render(ctx)
  }
})

engine.canvas.el.onclick = function() {
  engine.togglePause()
}
