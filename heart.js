var settings = {
  particles: {
    length: 10000, // Số lượng tối đa các hạt
    duration: 4, // Thời gian tồn tại của hạt (giây)
    velocity: 80, // Tốc độ của hạt (pixel/giây)
    effect: -1.3, // Hiệu ứng gia tốc, giá trị âm làm chậm hạt
    size: 8, // Kích thước của hạt (pixel)
  },
};

// Polyfill cho requestAnimationFrame
(function () {
  var b = 0;
  var c = ["ms", "moz", "webkit", "o"];
  for (var a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
    window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[c[a] + "CancelAnimationFrame"] ||
      window[c[a] + "CancelRequestAnimationFrame"];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (h, e) {
      var d = new Date().getTime();
      var f = Math.max(0, 16 - (d - b));
      var g = window.setTimeout(function () {
        h(d + f);
      }, f);
      b = d + f;
      return g;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (d) {
      clearTimeout(d);
    };
  }
})();

// Lớp Point
var Point = (function () {
  function Point(x, y) {
    this.x = typeof x !== "undefined" ? x : 0;
    this.y = typeof y !== "undefined" ? y : 0;
  }
  Point.prototype.clone = function () {
    return new Point(this.x, this.y);
  };
  Point.prototype.length = function (length) {
    if (typeof length == "undefined")
      return Math.sqrt(this.x * this.x + this.y * this.y);
    this.normalize();
    this.x *= length;
    this.y *= length;
    return this;
  };
  Point.prototype.normalize = function () {
    var length = this.length();
    this.x /= length;
    this.y /= length;
    return this;
  };
  return Point;
})();

// Lớp Particle
var Particle = (function () {
  function Particle() {
    this.position = new Point();
    this.velocity = new Point();
    this.acceleration = new Point();
    this.age = 0;
  }
  Particle.prototype.initialize = function (x, y, dx, dy) {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = dx;
    this.velocity.y = dy;
    this.acceleration.x = dx * settings.particles.effect;
    this.acceleration.y = dy * settings.particles.effect;
    this.age = 0;
  };
  Particle.prototype.update = function (deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.age += deltaTime;
  };
  Particle.prototype.draw = function (context, image, canvas) {
    function ease(t) {
      return --t * t * t + 1;
    }
    var size = image.width * ease(this.age / settings.particles.duration);
    context.globalAlpha = 1 - this.age / settings.particles.duration;

    // Calculate the fill style based on age
    if (this.age < settings.particles.duration / 2) {
      context.fillStyle = "#f50b02"; // red
    } else {
      context.fillStyle = this.position.x < canvas.width / 2 ? "#f50b02" : "#00ff00"; // red or green based on position
    }

    // Draw the image
    context.drawImage(
      image,
      this.position.x - size / 2,
      this.position.y - size / 2,
      size,
      size
    );
  };
  return Particle;
})();

// Lớp ParticlePool
var ParticlePool = (function () {
  var particles,
    firstActive = 0,
    firstFree = 0,
    duration = settings.particles.duration;

  function ParticlePool(length) {
    // create and populate particle pool
    particles = new Array(length);
    for (var i = 0; i < particles.length; i++) particles[i] = new Particle();
  }
  ParticlePool.prototype.add = function (x, y, dx, dy) {
    particles[firstFree].initialize(x, y, dx, dy);

    // handle circular queue
    firstFree++;
    if (firstFree == particles.length) firstFree = 0;
    if (firstActive == firstFree) firstActive++;
    if (firstActive == particles.length) firstActive = 0;
  };
  ParticlePool.prototype.update = function (deltaTime) {
    var i;

    // update active particles
    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++) particles[i].update(deltaTime);
    }
    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++) particles[i].update(deltaTime);
      for (i = 0; i < firstFree; i++) particles[i].update(deltaTime);
    }

    // remove inactive particles
    while (
      particles[firstActive].age >= duration &&
      firstActive != firstFree
    ) {
      firstActive++;
      if (firstActive == particles.length) firstActive = 0;
    }
  };
  ParticlePool.prototype.draw = function (context, image, canvas) {
    // draw active particles
    if (firstActive < firstFree) {
      for (var i = firstActive; i < firstFree; i++) particles[i].draw(context, image, canvas);
    }
    if (firstFree < firstActive) {
      for (var i = firstActive; i < particles.length; i++) particles[i].draw(context, image, canvas);
      for (var i = 0; i < firstFree; i++) particles[i].draw(context, image, canvas);
    }
  };
  return ParticlePool;
})();

// Chức năng chính
(function (canvas) {
  var context = canvas.getContext("2d"),
    particles = new ParticlePool(settings.particles.length),
    particleRate = settings.particles.length / settings.particles.duration, // particles/sec
    time;

  // Tạo hình ảnh hạt
  var image = (function () {
    var canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    canvas.width = settings.particles.size;
    canvas.height = settings.particles.size;
    // Vẽ hình trái tim nhỏ
    function to(t) {
      return (t / Math.PI) * 180;
    }
    context.beginPath();
    for (var t = 0; t < Math.PI * 2; t += Math.PI / 64) {
      var x = settings.particles.size / 2 + (settings.particles.size / 2) * 0.8 * Math.pow(Math.sin(t), 3);
      var y = settings.particles.size / 2 - (settings.particles.size / 2) * (0.6 * Math.cos(t) - 0.2 * Math.cos(2 * t) - 0.2 * Math.cos(3 * t) - 0.1 * Math.cos(4 * t));
      if (t === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.fillStyle = "#ff6699";
    context.fill();

    // Tạo và trả về đối tượng hình ảnh
    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
  })();

  function pointOnHeart(t) {
    return new Point(
      160 * Math.pow(Math.sin(t), 3),
      130 * Math.cos(t) -
        50 * Math.cos(2 * t) -
        20 * Math.cos(3 * t) -
        10 * Math.cos(4 * t) +
        25
    );
  }

  function render() {
    // next animation frame
    requestAnimationFrame(render);

    // update time
    var newTime = new Date().getTime() / 1000,
      deltaTime = newTime - (time || newTime);
    time = newTime;

    // clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // create new particles
    var amount = particleRate * deltaTime;
    for (var i = 0; i < amount; i++) {
      var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      var dir = pos.clone().length(settings.particles.velocity);
      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 - pos.y,
        dir.x,
        -dir.y
      );
    }

    // update and draw particles
    particles.update(deltaTime);
    particles.draw(context, image, canvas);
  }

  // handle (re-)sizing of the canvas
  function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.onresize = onResize;

  // delay rendering bootstrap
  setTimeout(function () {
    onResize();
    render();
  }, 10);
})(document.getElementById("pinkboard"));




document.addEventListener("DOMContentLoaded", () => {
  const colorBoard = document.getElementById("color-board");
  const textElement = document.querySelector(".animated-text");
  const text = textElement.textContent;
  textElement.textContent = "";

  let index = 0;
  const typingSpeed = 150; // Tốc độ xuất hiện từng chữ (ms)

  function typeWriter() {
      if (index < text.length) {
          const span = document.createElement('span');
          span.textContent = text.charAt(index);
          span.style.setProperty('--delay', `${index * typingSpeed}ms`);
          textElement.appendChild(span);
          index++;
          setTimeout(typeWriter, typingSpeed);
      }
  }

  typeWriter();

  colorBoard.addEventListener("click", () => {
      textElement.style.animation = "fadeOut 1s forwards";
      setTimeout(() => {
          colorBoard.style.display = "none";
      }, 1000); // Thời gian để ẩn hoàn toàn div (phải trùng với thời gian animation)
  });
});

