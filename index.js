(function(document, window) {

  const states = {
    init: 0,
    start: 1,
    play: 2,
    pause: 3,
    end: 4,
    last: null
  }

  /**
   * Engine
   *
   * Initializes the engine and loops.
   */

  function Engine(settings = {
      canvas: document.querySelector('canvas'),
      size: { width: 640, height: 480 }
  }) {
    // always act as a constructor
    if (!(this instanceof Engine)) return new Engine(settings)

    let { canvas, size } = settings

    // handle no canvas found
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(
        'Engine requires a canvas to render on. Pass a canvas element as `canvas.el` in your settings object. See the documentation for more help.'
      )
    }

    this.sizes = {
      width: size.width,
      height: size.height
    }

    canvas.width = this.sizes.width
    canvas.height = this.sizes.height

    this.canvas = canvas
    this.context = canvas.getContext('2d')

    this.state = states.init
  }

  Engine.prototype = {
    setState (state) {
      let vals = Object.keys(states).map(k => states[k])
      let last = states.last
      states.last = this.state

      if (~vals.indexOf(state)) {
        this.state = state
      } else if (states.hasOwnProperty(state)) {
        this.state = states[state]
      } else {
        states.last = last
        throw new Error('Cannot find state ' + state + '. Possible states: ' + vals.join(', ') + '.')
      }
    },

    start ({ loop, render }) {
      if (this.state === states.init) {
        this.render = function RENDER_LOOP() {
          if (this.state === states.pause) return null

          this.context.clearRect(0, 0, this.sizes.width, this.sizes.height)

          render(this.context)

          requestAnimationFrame(RENDER_LOOP.bind(this))
        }

        function SIM_LOOP() {
          if (this.state === states.pause) return null

          loop()
        }

        setInterval(SIM_LOOP.bind(this), 50)
        requestAnimationFrame(this.render.bind(this))

        this.setState(states.start)
      }
    },

    togglePause () {
      if (this.state === states.pause) {
        this.setState(states.play)
        this.render.call(this)
        console.log('Unpaused')
      } else {
        this.setState(states.pause)
        console.log('Paused')
      }
    }
  }

  /**
   * Engine.random
   *
   * Utility methods for getting random
   * (or semi-random, probably) values.
   */

  Engine.random = {
    inRange (min, max = 0) {
      let maximum = max
      let minimum = min

      if (min > max) {
        maximum = min
        minimum = max
      }

      return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
    },
    inRangeFloat (min, max) {
      let maximum = max
      let minimum = min

      if (min > max) {
        maximum = min
        minimum = max
      }

      return Math.random() * (maximum - minimum) + minimum
    },
    inArray (array) {
      let index = this.inRange(array.length - 1)
      return array[index]
    }
  }

  /**
   * Engine.createObject
   *
   * Creates an object with position, velocity,
   * acceleration, and size. Requires a render
   * method. Can be initialized with init method.
   *
   * @param {Object} settings Settings for game object
   *   @key {Function} init Function to set up the object
   *   @key {Function} render Function to handle rendering the object
   */

  Engine.createObject = function GameObject(settings) {
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

  Engine.createObject.prototype = {
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
   * ParticleEmitter
   *
   * Emits objects and shit?
   */

  Engine.createEmitter = function ParticleEmitter(limit = 25, settings = {}) {
    if (!(this instanceof ParticleEmitter)) {
      return new ParticleEmitter(limit, settings)
    }

    let { color, position, size, speed, init } = settings
    let spread = settings.spread || { high: 3, low: -3 }

    this.limit = limit

    this.color = settings.color || 'black'
    this.size = size || 2

    this.source = { x: position.x || 0, y: position.y || 0 }
    this.spread = { high: spread.high, low: spread.low }
    this.speed = typeof speed === 'number' ? Math.abs(speed) : 10

    this.particles = init ? [this.createParticle(this.source.x, this.source.y)] : []
  }

  Engine.createEmitter.prototype = {
    createParticle (position) {
      let { size, color, spread, speed, source } = this
      let { x: srcX, y: srcY } = source

      return Engine.createObject({
        init: function() {
          this.setSize(size)
          this.setPosition({ x: srcX, y: srcY })
          this.setVelocity({ x: speed, y: randomInRange(spread.high, spread.low) })
          this.setAcceleration(1)

          this.color = color
        },
        render: function(ctx) {
          let { x, y } = this.position
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.arc(x, y, this.size.width, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    },

    emit () {
      this.particles.forEach(function(p) {
        p.move()
      })

      if (this.particles.length < this.limit) {
        this.particles.push(this.createParticle(this.position))
      } else {
        this.particles.shift()
      }
    },

    render (ctx) {
      this.particles.forEach(function(p) {
        p.render(ctx)
      })
    }
  }

  window.Engine = Engine

})(document, window)
