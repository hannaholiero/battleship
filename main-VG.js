
///////////////////// Globala variabler //////////////////////////

const rows = 10;
const cols = 10;
const nrOfShips = 2;

const player1 = {
  mark: 1,
  boms: [], // coordinates [{ row: nr, col: nr }, ...] for missed shots
  hits: [], // coordinates [{ row: nr, col: nr }, ...] for hit shots
  ships: [], // coordinates [{ row: nr, col: nr }, ...] for all ships
};

const player2 = {
  mark: 2,
  boms: [],
  hits: [],
  ships: [],
};

// object to easily switch players
let players = { current: player1, enemy: player2 };

// DOM elements to manipulate
const display = document.querySelector("section.display");
const playerDisplay = document.querySelector(".display-player");
const tiles = Array.from(document.querySelectorAll(".tile"));
const announcer = document.querySelector(".announcer");
const button = document.querySelector("button");


///////////////////// Helper functions //////////////////////////

// determine if val is primitive value (true/false)
function isPrimitive(val) {
  return ["number", "boolean", "string", "undefined"].includes(typeof val);
}

// determine if val is object value (true/false)
function isObject(val) {
  return typeof val === "object";
}

// Helper method added to Object prototype to determine equality

Object.prototype.equals = function (otherObj) {
  const thisKeys = Object.keys(this);
  const otherKeys = Object.keys(otherObj);
  if (thisKeys.length !== otherKeys.length) {
    return false;
  }
  for (let key of thisKeys) {
    const thisVal = this[key];
    const otherVal = otherObj[key];
    if (typeof thisVal !== "object") {
      if (thisVal !== otherVal) {
        return false;
      }
    } else {
      if (!thisVal.equals(otherVal)) {
        return false;
      }
    }
  }
  return true;
};

// Helper method added to Array prototype to determine if value exist in array
Array.prototype.contains = function (value) {
  if (isObject(value) && value.length === undefined) {
    for (let i = 0; i < this.length; i++) {
      if (value.equals(this[i])) {
        // we found an equal element
        return true;
      }
    }
  }
  if (isPrimitive(value)) {
    return this.includes(value); // see if array has primitive value inside
  }
  return false;
};

///////////////////// DOM functions /////////////////////////////

// displays in DOM node announcer a text message and removes .hide
// class
function announce(message) {
  announcer.innerHTML = message;
  announcer.classList.remove("hide");
}

// clears DOM node announcer (removes innerHTML) and removes it
// by adding .hide class
function clearAnnounce() {
  announcer.innerHTML = "";
  announcer.classList.add("hide");
}

function displayTurn(player) {
  console.log(playerDisplay); // Kontrollera att det här visar det förväntade elementet
  console.log(player); // Kontrollera att spelarobjektet (player) är korrekt
  playerDisplay.innerHTML = `Player <span class="display-player player${player.mark}">${player.mark}</span>`;
  playerDisplay.classList.remove("player1", "player2");
  playerDisplay.classList.add(`player${player.mark}`);
}

// displays in DOM node playerDisplay the winner and loser of the game
function displayGameOver(winner, loser) {
  const winnerStr = `Player <span class="display-player player${winner.mark}">${winner.mark}</span>`;
  const loserStr = ` wins over player <span class="display-player player${loser.mark}">${loser.mark}</span>`;
  display.innerHTML = winnerStr + loserStr;
  announce("Game Over");
}

// given a tile (DOM node) returns that tiles row and col position in grid
// ex: <div class="tile" data-row="1" data-col="2"></div> => { row: 1, col: 2 }
// tip: use tile.getAttribute
function getCoordinates(tile) {
  const row = parseInt(tile.getAttribute("data-row"));
  const col = parseInt(tile.getAttribute("data-col"));
  return { row, col };
}

// given a tile (DOM node) clears that tile in grid
// gets rid of .player1 and .player2 classes as well as clears innerHTML
function clearTile(tile) {
  tile.innerHTML = "";
  tile.classList.remove("player1", "player2", "bom");
}

// clears the whole grid of with help of clearTile
// tip: use a for-loop over all tiles and call clearTile for each tile
function clearGrid() {
  tiles.forEach((tile) => clearTile(tile));
}

// clears all coordinates of ship in grid
// (tip: use getCoordinates, contains and clearTile)
function removeShip(ship) {
  tiles.forEach((tile) => {
    const coord = getCoordinates(tile);
    if (ship.contains(coord)) {
      clearTile(tile);
    }
  });
}

// given a tile an mark (1, 2 or X) adds the mark on the tile
function addMark(tile, mark) {
  tile.innerHTML = mark;
  if (mark === player1.mark || mark === player2.mark) {
    tile.classList.add(`player${mark}`);
  } else if (mark === "X") {
    tile.classList.add(`bom`);
  }
}

function displayMarkersOnGrid(markers) {
  tiles.forEach((tile) => {
    const { row, col } = getCoordinates(tile);
    for (const marker of markers) {
      if (marker.row === row && marker.col === col) {
        addMark(tile, marker.mark);
      }
    }
  });
}

// given a player, display that players hits and boms array with help of
// displayMarkersOnGrid
function displayHitsAndBoms(player) {
  clearGrid();
  const markedHits = player.hits.map((coord) => ({
    ...coord,
    mark: player.mark,
  }));
  const markedBoms = player.boms.map((coord) => ({
    ...coord,
    mark: "X",
  }));
  displayMarkersOnGrid([...markedHits, ...markedBoms]);
}


function glowShip(ship, ms) {
  tiles
    .filter((tile) => {
      const tileCoord = getCoordinates(tile);
      return ship.contains(tileCoord);
    })
    .forEach((tile) => {
      tile.classList.add("glow");
      setTimeout(() => {
        tile.classList.remove("glow");
      }, ms);
    });
}

///////////////////// Initialize ships //////////////////////////

function isValidShip(ship) {
  // DENNA ÄR EGEN
  // Check if the ship has at least two coordinates and at most five coordinates
  if (ship.length <= 2 || ship.length >= 5) {
    return false;
  }

  // Check if all coordinates in the ship are in a straight line
  const firstCoord = ship[0];
  const lastCoord = ship[ship.length - 1];

  const isHorizontal = firstCoord.row === lastCoord.row;
  const isVertical = firstCoord.col === lastCoord.col;

  if (!(isHorizontal || isVertical)) {
    return false;
  }

  // Check that the coordinates are consecutive
  for (let i = 1; i < ship.length; i++) {
    if (isHorizontal && ship[i].row !== firstCoord.row) {
      return false;
    }
    if (isVertical && ship[i].col !== firstCoord.col) {
      return false;
    }
  }

  return true;
}

// Ask both users for all their ships positions
//    player: one of the players
//    callback: function to be called when all ships have been placed by player
function initializeShips(player, callback) {
  let shipCount = 0;
  let currentShip = [];
  displayTurn(player);
  announce(`Choose your remaining ${nrOfShips} ships!`);

  // event listener function
  function handleTileClick(evt) {
    const tile = evt.target;
    const coords = getCoordinates(tile);
    currentShip.push(coords);
    addMark(tile, player.mark);
  }

  // event listener function
  function handleAddShipClick() {
    if (isValidShip(currentShip)) {
      // let the ship glow for 1 sec in grid to mark that it is added
      glowShip(currentShip, 1000);

      // register ship coordinates in players ships array
      player.ships = [...currentShip, ...player.ships];
      currentShip = []; // reset currentShip
      shipCount++; // increase count of ships
      announce(`Choose your remaining ${nrOfShips - shipCount} ships!`);

      // if all 5 ships have been registered
      if (shipCount === nrOfShips) {
        // recover grid and remove all added event listeners
        clearGrid();
        button.removeEventListener("click", handleAddShipClick);
        tiles.forEach((tile) =>
          tile.removeEventListener("click", handleTileClick)
        );
        callback(); // now we can execute the callback when button has been clicked for the last time
      }
    } else {
      alert(`HALLÅE ELLER! DU GÖR FEL!
      * Skeppet måste vara rakt, goddamn!
      * Skeppet måste vara mer än två rutor långa, 
      det är ju ingen jolle.
      * Skeppet får inte vara mer än fem rutor
      det är inte Stena Line det här.
      `);
      removeShip(currentShip); // remove the last ship since it was not valid
      currentShip = []; // reset ship
    }
  }

  // add event listeners
  button.addEventListener("click", handleAddShipClick);
  tiles.forEach((tile) => tile.addEventListener("click", handleTileClick));
}

//////////////////////// Game loop ////////////////////////////////

// adds mark (1, 2 or X) to coordinate object { row, col } => { row, col, mark }
// Check test.js for specification of how it should work
function markCoord(coord, mark) {
  return { ...coord, mark };
}

// determines if player has lost (true/false)
// tip: check out player.ships and player.hits ;-)
// Check test.js for specification of how it should work
function hasLost(player) {
  return player.ships.length === player.hits.length;
}

// adds guess coordinates { row, col } to either players hits or boms array
// depending on whether it hit or missed any of the players ships coordinates
// Check test.js for specification of how it should work

function registerHitOrBom(guess, player) {
  if (player.ships.contains(guess)) {
    player.hits.push(guess);
    markCoord(guess, player.mark);
  } else {
    player.boms.push(guess);
    markCoord(guess, "X");
  }
}

// switch players object around so that
// { current: p1, enemy: p2 } => { current: p2, enemy: p1 }
// Check test.js for specification of how it should work
function switchPlayers(players) {
  const temp = players.current;
  players.current = players.enemy;
  players.enemy = temp;
  return players;
}


let targetChoosen = false; // flag to determine if user has clicked at a tile

// event listener function for "Next player" button
function handleNextPlayerClick() {
  // if user has clicked tile allow to run next loop
  if (targetChoosen) {
    targetChoosen = false; // reset flag
    gameLoop(); // runs another turn of game loop
  } else {
    alert("You must choose a tile to shoot first");
  }
}

// stops game
function stopGame() {
  displayGameOver(players.current, players.enemy);
  button.innerHTML = "Restart";
  button.removeEventListener("click", handleNextPlayerClick);
  button.addEventListener("click", () => location.reload());
}

// event listener function for when tile is clicked by user
function handleTileClick(evt) {
  const guess = getCoordinates(evt.target); // what tile was clicked?
  registerHitOrBom(guess, players.enemy); // add guess to either enemy hits or boms array
  displayHitsAndBoms(players.enemy); // display all enemys hits and boms array
  // remove event listener from all tiles, so player cannot click any more tiles
  tiles.forEach((tile) => tile.removeEventListener("click", handleTileClick));
  if (hasLost(players.enemy)) {
    stopGame(); // current is winner, stop running game loop
  } else {
    players = switchPlayers(players);
    targetChoosen = true; // mark flag so that we know user has clicked on tile
  }
}


// game loop, main parts are
// * displays turn of current player
// * displays in grid enemys hits and boms,
// * adds evenlistener handleTileClick to each tile so that user kan guess
function gameLoop() {
  displayTurn(players.current);
  displayHitsAndBoms(players.enemy);
  // add event listeners
  tiles.forEach((tile) => tile.addEventListener("click", handleTileClick));
}

///////////////////// Game start //////////////////////////

function runGame() {
  // initializeShips uses a player object to set up all ships, and when done calls the callback
  // function given as second argument. We have to do this since the JavaScript engine is an
  // asynchrounous (i.e does not wait for a function to finish). To learn more check out this
  // video on youtube: "What the heck is the eventloop anyway?"
  initializeShips(player1, () => {
    initializeShips(player2, () => {
      button.innerHTML = "Next player";
      button.addEventListener("click", handleNextPlayerClick);
      clearAnnounce();
      gameLoop();
    });
  });
}

runGame();