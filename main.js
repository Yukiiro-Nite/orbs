// https://sinepost.wordpress.com/2012/08/19/bouncing-off-the-walls/
// https://sinepost.wordpress.com/2012/09/05/making-your-balls-bounce/
let canvas
let context

const gameObjects = {}
const playerId = "player"
const objectCount = 5
const PI = Math.PI
const TAU = PI * 2

const defaultObjectSize = 25
const defaultControls = {
  'a': 'LEFT',
  's': 'DOWN',
  'd': 'RIGHT',
  'w': 'UP'
}

const controlActions = {
  RIGHT: (obj) => obj.vx += obj.acceleration,
  LEFT : (obj) => obj.vx -= obj.acceleration,
  UP   : (obj) => obj.vy -= obj.acceleration,
  DOWN : (obj) => obj.vy += obj.acceleration,
}

function main() {
  canvas = document.querySelector('#canvas')
  context = canvas.getContext('2d')

  setupCanvasSize()
  setupGameObjects()

  const clearInterval = setInterval(update, 1000/30)
}

function update() {
  updateCollidingEntities()
  Object.entries(gameObjects).forEach(([key, object]) => object.update())

  draw()
}

function updateCollidingEntities() {
  const entries = Object.entries(gameObjects)
  const collisions = entries.map(([keyA, objA]) => [
      keyA,
      entries.filter(([keyB, objB]) => keyA !== keyB && objA.hasCollision(objB))
        .map(([key]) => key)
    ]
  )
    .filter(([key, collisions]) => collisions.length > 0)

  if(collisions.length > 0) {
    const uniqueCollisionsMap = collisions.reduce((acc, [colliderA, secondaries]) => {
      secondaries.forEach((colliderB) => {
        acc.push([colliderA, colliderB])
      })
      return acc;
    }, [])
    .map(collision => collision.sort().join('-')) // this character could be a problem later
    .reduce((acc, collisionStr) => {
      acc[collisionStr] = collisionStr
      return acc
    }, {})

    const uniqueCollisions = Object.values(uniqueCollisionsMap).map((str) => {
      const [colliderA, colliderB] = str.split('-')
      return {
        colliderA,
        colliderB
      }
    })

    uniqueCollisions
      .map(({colliderA, colliderB}) => ({
        colliderA: gameObjects[colliderA],
        colliderB: gameObjects[colliderB]
      }))
      .forEach(({colliderA, colliderB}) => {
        colliderA.collide(colliderB)
        colliderB.collide(colliderA)


        // well this is getting closer, but isn't perfect
        // - sometimes shapes stick to each other
        // - when the circles collide they do not bounce in the extected direction
        const xVels = getVelocities(colliderA.vx, colliderA.mass, colliderB.vx, colliderB.mass)
        const yVels = getVelocities(colliderA.vy, colliderA.mass, colliderB.vy, colliderB.mass)

        colliderA.vx = xVels.v1
        colliderA.vy = yVels.v1

        colliderB.vx = xVels.v2
        colliderB.vy = yVels.v2

      })
  }
}

function getVelocities(v1, m1, v2, m2) {
  const totalMass = m1 + m2;
  const massDifference = m1 - m2;
  return {
    v1: ((massDifference / totalMass) * v1) + (((2 * m2) / totalMass) * v2),
    v2: (((2 * m1) / totalMass) * v1) - ((massDifference / totalMass) * v2)
  }
}

function draw() {
  context.clearRect(0,0,canvas.width, canvas.height)

  Object.entries(gameObjects).forEach(([key, object]) => object.draw())
}

function setupCanvasSize() {
  canvas.width = document.body.clientWidth
  canvas.height = document.body.clientHeight

  window.addEventListener('resize', () => {
    canvas.width = document.body.clientWidth
    canvas.height = document.body.clientHeight
  })

  canvas.focus()
}

function setupGameObjects() {
  gameObjects[playerId] = new Player({
    x: (canvas.width / 2),
    y: (canvas.height / 2)
  })

  new Array(objectCount).fill().forEach((_, index) => {
    gameObjects[index] = new GameObject()
  })
}

class GameObject {
  constructor(options = {}) {
    const {
      x = random(canvas.width),
      y = random(canvas.height),
      vx = 0,
      vy = 0,
      acceleration = 1,
      drag = 0.9,
      size = defaultObjectSize, // this is the radius
      density = 1,
      color = "#ff00ff",
    } = options

    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.acceleration = acceleration
    this.drag = drag
    this.size = size
    this.density = density
    this.volume = PI * Math.pow(this.size, 2)
    this.mass = this.density * this.volume
    this.color = color
  }

  update() {
    this.x += this.vx
    this.y += this.vy

    this.vx *= this.drag
    this.vy *= this.drag
  }

  draw() {
    context.fillStyle = this.color
    context.beginPath()
    context.arc(this.x, this.y, this.size, 0, TAU)
    context.fill()
  }

  hasCollision(b) {
    const combinedRadius = this.size + b.size;
    const dist = distance(this.x, this.y, b.x, b.y)

    return dist < combinedRadius
  }

  collide(b) {

  }

  getVector() {
    return {
      direction: Math.atan2(this.y - this.y + this.vy, this.x - this.x + this.vx),
      magnitude: distance(this.x, this.y, this.x + this.vx, this.y + this.vy)
    }
  }
}

class Player extends GameObject {
  constructor(options) {
    super(options)
    this.controls = options.controls || defaultControls
    this.controlState = {}

    canvas.addEventListener('keydown', this.handleKeyDown.bind(this))
    canvas.addEventListener('keyup', this.handleKeyUp.bind(this))
  }

  handleKeyDown(event) {
    const controlValue = this.controls[event.key]
    if(controlValue){
      this.controlState[controlValue] = true
    }
  }

  handleKeyUp(event) {
    const controlValue = this.controls[event.key]
    if(controlValue){
      this.controlState[controlValue] = false
    }
  }

  update() {
    const activeControls = Object.keys(this.controlState)
      .filter(key => this.controlState[key])

    activeControls.forEach(control => controlActions[control](this))

    super.update()
  }

  draw() {
    super.draw()
    const vector = this.getVector()
    const xRatio = Math.cos(vector.direction)
    const yRatio = Math.sin(vector.direction)

    const xCenterOffset = xRatio * this.size
    const yCenterOffset = yRatio * this.size

    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(xCenterOffset + this.x, yCenterOffset + this.y, 5, 0, TAU)
    context.fill()
  }
}

function random(start, end) {
  if(end === undefined) {
    return random(0, start)
  }
  if(start > end) {
    return random(end, start)
  }

  const scale = end - start

  return Math.random() * scale + start
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2-x1, y2-y1)
}