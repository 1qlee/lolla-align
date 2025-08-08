import { useState, useRef, useEffect, Fragment } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { puzzles } from "./data/grid.puzzles";
import Grid from "./Grid";
import GlobeLogo from "./assets/globe.svg";
import AlignLogo from "./assets/align-logo.png";
import Modal from "./Modal";

import {
  TimerIcon,
  ArrowsClockwiseIcon,
  CrownSimpleIcon,
  PuzzlePieceIcon,
  StarIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";

gsap.registerPlugin(useGSAP, Draggable, Flip, SplitText);

const formatTime = (options) => {
  const { ms, legible, scored } = options;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);

  // Pad with leading zeros to ensure consistent two-digit format
  const formatNumber = (num) => String(num).padStart(2, "0");
  const minutesExist = minutes > 0;

  if (legible) {
    return (
      <>
        <span>{minutes > 0 ? `${minutes}` : ""}</span>
        {minutesExist && <span className="text-2xl">m</span>}
        <span>
          {minutesExist ? ` ${seconds}` : `${seconds}`}:
          {formatNumber(hundredths)}
        </span>
        <span className="text-2xl">s</span>
      </>
    );
  }

  if (scored) {
    return `${formatNumber(minutes)}:${formatNumber(seconds)}:${formatNumber(
      hundredths
    )}`;
  }

  return `
    ${formatNumber(minutes)}:${formatNumber(seconds)}
  `;
};

const FINAL_PUZZLE_INDEX = puzzles.length - 1;
const FLAVOR_TEXTS = [
  "Off to a great start!",
  "You've got the hang of it!",
  "Momentum is building!",
  "You're on a roll now!",
  "The puzzle bows before you!",
  "Aligned with success!",
];

function App() {
  const congratsRef = useRef(null);
  const congratsIconRef = useRef(null);
  const passwordRef = useRef("");
  const nameRef = useRef("");
  const intervalRef = useRef(null);
  const [timer, setTimer] = useState(0);
  const [puzzleResults, setPuzzleResults] = useState([]);
  const [formMsg, setFormMsg] = useState({
    text: "",
    type: "",
  });
  const [puzzleData, setPuzzleData] = useState({
    index: 0,
    cells: [],
    alphaGroups: [],
    name: "",
    password: "",
    moves: 0,
  });
  const [finalPuzzleCompleted, setFinalPuzzleCompleted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [changePuzzle, setChangePuzzle] = useState(false);
  const [submitting, setSubmitting] = useState({
    text: "Submit",
    loading: false,
    type: "score",
  });

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTimer((prevTime) => prevTime + 10); // Update time every 10 milliseconds
    }, 10);
  };

  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const resetTimer = () => {
    pauseTimer();
    setTimer(0);
  };

  async function handleSubmitPassword(event, checkName) {
    event.preventDefault();

    const inputPassword = passwordRef.current.value.trim().toLowerCase();

    if (!inputPassword) {
      return;
    }

    let userName = "";
    if (checkName) {
      userName = nameRef.current.value.trim();

      if (!userName) {
        setFormMsg({
          text: "Cannot be blank!",
          type: "name",
        });
        return;
      }
    }
    const puzzleToLoad = puzzles.find(
      (puzzle) => puzzle.password === inputPassword
    );

    if (!puzzleToLoad) {
      setFormMsg({
        text: "Incorrect password!",
        type: "password",
      });
      setSubmitting({
        ...submitting,
        text: "Submit",
        loading: false,
      });
      return;
    }

    const puzzleToLoadIndex = puzzles.indexOf(puzzleToLoad);

    // prevent loading the same puzzle or going back to a prior puzzle
    if (!checkName && puzzleToLoadIndex <= puzzleData.index) {
      setFormMsg({
        text: "There's no going back...",
        type: "password",
      });
      return;
    }

    setSubmitting({
      ...submitting,
      text: "Loading...",
      loading: true,
    });

    await new Promise((resolve) =>
      setTimeout(() => {
        setSubmitting({
          ...submitting,
          loading: false,
        });
        resolve();
      }, 1000)
    );

    setPuzzleData((prev) => {
      return {
        moves: 0,
        index: puzzleToLoadIndex,
        name: userName || prev.name,
        password: inputPassword,
        cells: puzzleToLoad.cells,
        alphaGroups: puzzleToLoad.alphaGroups,
      };
    });
    setSubmitting({
      text: "Submit",
      loading: false,
      type: "score",
    });
    resetTimer();
    startTimer();
    setChangePuzzle(false);
    setGameCompleted(false);
    passwordRef.current.value = "";
  }

  function resetFormMsg() {
    setFormMsg({
      text: "",
      type: "",
    });
  }

  async function handleSubmitScore() {
    function resetSubmitStatus() {
      return setTimeout(() => {
        setSubmitting({
          ...submitting,
          loading: false,
          type: "score",
        });
      }, 2000);
    }

    try {
      const { index, name, moves } = puzzleData;
      const data = {
        puzzle: index + 1,
        name,
        time: formatTime({ ms: timer, scored: true }),
        moves,
        sheet: `Sheet${index + 1}`,
      };

      setSubmitting({
        ...submitting,
        text: "Sending...",
        loading: true,
      });

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbwmDQn1lLBpinHTBjMMkw6yLHOUAbYuIIofNsODoNvTjF9mhGtbKavxrnaqAadnr32D/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (result.status === "error") {
        setSubmitting({
          ...submitting,
          text: "Something went wrong! Please try again.",
          loading: false,
        });

        resetSubmitStatus();
      } else {
        setSubmitting({
          ...submitting,
          text: "Success!",
          loading: false,
        });

        setTimeout(() => {
          setSubmitting({
            type: "puzzle",
            text: "Enter",
            loading: false,
          });

          if (puzzleData.index === FINAL_PUZZLE_INDEX) {
            setFinalPuzzleCompleted(true);
          }
        }, 1000);
      }
    } catch (error) {
      setSubmitting({
        ...submitting,
        text: "Something went wrong!",
        loading: false,
      });

      resetSubmitStatus();
    }
  }

  useGSAP(
    () => {
      document.fonts.ready.then(() => {
        if (
          congratsIconRef.current &&
          congratsRef.current &&
          finalPuzzleCompleted
        ) {
          SplitText.create(congratsRef.current, {
            type: "chars",
            charsClass:
              "congratsChar font-bold text-primary-600 aspect-square text-trim-start flex items-center",
            onSplit: (self) => {
              gsap.from(self.chars, {
                yPercent: "random([-10,10])",
                rotation: "random([-10, 10])",
                autoAlpha: 0,
                delay: 0.125,
                stagger: {
                  amount: 0.5,
                  from: "random",
                },
              });
            },
          });

          gsap.fromTo(
            congratsIconRef.current,
            {
              rotate: 4,
              opacity: 0,
              y: -8,
              duration: 0.25,
              delay: 0.5,
            },
            {
              opacity: 1,
              y: 0,
              rotate: -12,
              duration: 0.25,
              ease: "back.inOut",
              delay: 0.5,
            }
          );
        }
      });
    },
    {
      dependencies: [
        gameCompleted,
        finalPuzzleCompleted,
        congratsIconRef.current,
        congratsRef.current,
      ],
    }
  );

  useEffect(() => {
    if (gameCompleted) {
      const updatedResults = [...puzzleResults];
      updatedResults[puzzleData.index] = {
        index: puzzleData.index,
        moves: {
          num: puzzleData.moves,
          isLowest: false,
        },
        time: {
          num: timer,
          isLowest: false,
        },
      };

      const filteredResults = updatedResults.filter((result) => result);

      // Get all move counts and find the lowest
      const allMoves = filteredResults.map((result) => result.moves.num);
      const lowestMoves = Math.min(...allMoves) || 0;

      // Get all time values and find the lowest
      const allTimes = filteredResults.map((result) => result.time.num);
      const lowestTime = Math.min(...allTimes) || 0;

      const normalizedResults = updatedResults.map((result) => {
        if (!result) {
          return result;
        }

        return {
          ...result,
          moves: {
            ...result.moves,
            // Checks if the move number is the lowest
            isLowest: result.moves.num === lowestMoves,
          },
          time: {
            ...result.time,
            // Checks if the time value is the lowest
            isLowest: result.time.num === lowestTime,
          },
        };
      });

      setPuzzleResults(normalizedResults);
    }
  }, [gameCompleted]);

  return (
    <div className="font-display w-screen h-screen bg-gray-100 py-8 px-4 overflow-y-auto">
      <div className="mb-2 w-full">
        <img className="mx-auto mb-8" width="300" src={GlobeLogo} />
        <img className="mx-auto" width="75" src={AlignLogo} />
      </div>
      {puzzleData.password ? (
        <div className="w-full max-w-[560px] mx-auto">
          <div className="flex flex-col gap-2 items-center mb-8">
            <h1 className="text-center text-2xl font-bold">Align</h1>
            <div className="text-center bg-primary-600 px-2 rounded-md">
              <h2 className="text-lg text-primary-100">
                Puzzle #{+puzzleData.index + 1}
              </h2>
            </div>
          </div>
          <div>
            <div className="flex gap-2 h-[32px] justify-between mb-2 items-end">
              <div className="flex h-full gap-2">
                <div className="h-full text-primary-600 rounded-md min-w-[72px] flex items-center gap-1">
                  <TimerIcon size={20} weight="regular" />
                  <span className="text-lg text-trim-start leading-none">
                    {formatTime({ ms: timer })}
                  </span>
                </div>
                <div className="h-full text-primary-600 rounded-md flex items-center justify-center gap-1">
                  <ArrowsClockwiseIcon size={20} weight="regular" />
                  <span className="text-lg text-trim-start leading-none">
                    {puzzleData.moves}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setChangePuzzle(true)}
                className="w-max flex gap-1 whitespace-nowrap text-primary-600 bg-primary-100 border-2 border-primary-600 rounded-full py-1 px-2"
              >
                <PuzzlePieceIcon size={24} />
                <span>Change puzzle</span>
              </button>
            </div>
            <Grid
              puzzleIndex={puzzleData.index}
              pauseTimer={pauseTimer}
              setGameCompleted={setGameCompleted}
              setPuzzleData={setPuzzleData}
              cells={puzzleData.cells}
              alphaGroups={puzzleData.alphaGroups}
            />
            <div className="mt-4">
              <p className="mb-2">
                Align is an original word game from The Boston Globe. You can
                solve the{" "}
                <a
                  className="text-primary-600 shadow-[0_1px_0_var(--orange)]"
                  href="https://www.bostonglobe.com/games/align/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  daily puzzles on our website
                </a>{" "}
                or in the Globe mobile app.
              </p>
              <small>
                Designed by Brendan Emmett Quigley and Ben Gottlieb.
              </small>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col text-center items-center gap-2 mb-8">
            <h1 className="text-2xl font-bold">Align</h1>
            <div>
              <p>At Lollapuzzoola 18</p>
              <p>Presented by The Boston Globe</p>
            </div>
          </div>
          <form
            onSubmit={(e) => handleSubmitPassword(e, true)}
            className="flex flex-col gap-2"
          >
            <fieldset>
              <div className="flex justify-between items-center">
                <label htmlFor="name-input" className="font-semibold">
                  Contestant Number
                </label>
                {formMsg.type === "name" && (
                  <p className="text-red-600">{formMsg.text}</p>
                )}
              </div>
              <input
                autoComplete="off"
                type="text"
                id="name-input"
                ref={nameRef}
                onChange={resetFormMsg}
                className={clsx(
                  formMsg.type === "name" && `border-red-600`,
                  "w-full p-2 border border-gray-300 rounded"
                )}
              />
            </fieldset>
            <fieldset>
              <div className="flex justify-between items-center">
                <label htmlFor="password-input" className="font-semibold">
                  Puzzle Password
                </label>
                {formMsg.type === "password" && formMsg.text && (
                  <p className="text-red-600">{formMsg.text}</p>
                )}
              </div>
              <input
                type="text"
                autoComplete="off"
                id="password-input"
                onChange={resetFormMsg}
                ref={passwordRef}
                className={clsx(
                  formMsg.type === "password" && `border-red-600`,
                  "w-full p-2 border border-gray-300 rounded"
                )}
              />
            </fieldset>
            <button
              type="submit"
              className="mt-4 cursor-pointer w-full bg-primary-600 text-white p-4 rounded
              hover:bg-primary-600/90 transition-colors"
            >
              {submitting.loading ? "Starting..." : "Submit"}
            </button>
          </form>
        </div>
      )}
      {changePuzzle && (
        <Modal hasClose onClose={() => setChangePuzzle(false)}>
          <div className="text-center">
            <h2 className="text-2xl text-trim-startfont-bold mb-1">
              Change Puzzle
            </h2>
            <p className="mb-4">Enter the password of the puzzle.</p>
            <form onSubmit={handleSubmitPassword}>
              <fieldset className="flex gap-1">
                <input
                  type="text"
                  id="password-input"
                  autoComplete="off"
                  onChange={resetFormMsg}
                  ref={passwordRef}
                  className={clsx(
                    formMsg.type === "password" && `border-red-600`,
                    "w-full p-2 border border-gray-300 rounded grow"
                  )}
                />
                <button
                  className="cursor-pointer bg-primary-600 text-white px-4 rounded
                hover:bg-primary-600/90 transition-colors"
                >
                  {submitting.text}
                </button>
              </fieldset>
              {formMsg.type === "password" && formMsg.text && (
                <p className="text-red-600 mt-1">{formMsg.text}</p>
              )}
            </form>
          </div>
        </Modal>
      )}
      {gameCompleted && (
        <Modal>
          {finalPuzzleCompleted ? (
            <div>
              <div className="grid place-items-center relative">
                <h2 className="inline-block relative text-center text-2xl text-trim-startfont-bold mb-1">
                  <span ref={congratsRef}>Congratulations!</span>
                  <CrownSimpleIcon
                    ref={congratsIconRef}
                    size={24}
                    color="var(--orange)"
                    weight="fill"
                    className="absolute -top-4 -left-2 z-2"
                  />
                </h2>
              </div>
              <p className="modal-text mb-4">
                You've now finished all of our puzzles! This marks the end of
                our event at Lollapuzzoola 18. We hope you had a good time
                playing!
              </p>
              <div className="grid grid-cols-[minmax(80px,auto)_minmax(80px,auto)_1fr] mb-4 gap-1">
                <div className="font-bold">Puzzle</div>
                <div className="font-bold">Time</div>
                <div className="font-bold">Moves</div>
                {puzzleResults.map((puzzle, index) => (
                  <Fragment key={puzzle.index}>
                    <div>{+puzzle.index + 1}</div>
                    <div className="flex items-center">
                      <span>{formatTime({ ms: puzzle.time.num })}</span>
                      {puzzle.time.isLowest && (
                        <StarIcon
                          className="pb-1"
                          color="orange"
                          weight="fill"
                          size={20}
                        />
                      )}
                    </div>
                    <div className="flex items-center">
                      <span>{puzzle.moves.num}</span>
                      {puzzle.moves.isLowest && (
                        <StarIcon
                          className="pb-1"
                          color="orange"
                          weight="fill"
                          size={20}
                        />
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>
              <a
                href="https://www.bostonglobe.com/games/align/"
                target="_blank"
                rel="noopener noreferrer"
                className="modal-cta block cursor-pointer p-4 flex bg-primary-100 gap-4 rounded-md"
              >
                <div className="aspect-square h-min">
                  <img src={AlignLogo} width="75" />
                </div>
                <p className="text-primary-600">
                  Interested in playing more Align? Click here to play today's
                  daily puzzle on our website!
                </p>
              </a>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-8">
                <div className="stat text-center bg-primary-100 py-2 px-4 rounded-md">
                  <h3 className="text-lg mb-1">Time</h3>
                  <p className="text-4xl text-primary-600 font-bold">
                    {formatTime({ ms: timer, legible: true })}
                  </p>
                </div>
                <div className="stat text-center bg-primary-100 py-2 px-4 rounded-md">
                  <h3 className="text-lg mb-1">Moves</h3>
                  <p className="text-4xl text-primary-600 font-bold">
                    {puzzleData.moves}
                  </p>
                </div>
              </div>
              <div className="text-center">
                {submitting.type === "score" && (
                  <>
                    <h2 className="modal-text text-2xl font-bold mb-1">
                      {FLAVOR_TEXTS[puzzleData.index]}
                    </h2>
                    <p className="modal-text">
                      Submit your score by pressing the button.
                    </p>
                    <button
                      disabled={submitting.loading}
                      onClick={handleSubmitScore}
                      className={clsx(
                        `modal-cta mt-4 cursor-pointer w-full p-4 rounded hover:bg-primary-600/90 transition-colors`,
                        submitting.text === "Success!"
                          ? "bg-green-600 text-green-100 pointer-events-none"
                          : "bg-primary-600 text-primary-100"
                      )}
                    >
                      {submitting.text}
                    </button>
                  </>
                )}
                {submitting.type === "puzzle" && (
                  <>
                    <h2 className="text-2xl font-bold mb-1">
                      Ready for another?
                    </h2>
                    <p className="mb-1">
                      Enter the password for the next puzzle.
                    </p>
                    <form onSubmit={handleSubmitPassword}>
                      <fieldset className="flex gap-1">
                        <input
                          type="text"
                          id="password-input"
                          autoComplete="off"
                          onChange={resetFormMsg}
                          ref={passwordRef}
                          className={clsx(
                            formMsg.type === "password" && `border-red-600`,
                            "w-full p-2 border border-gray-300 rounded grow"
                          )}
                        />
                        <button
                          className="cursor-pointer bg-primary-600 text-white px-4 rounded
                hover:bg-primary-600/90 transition-colors"
                        >
                          {submitting.text}
                        </button>
                      </fieldset>
                      {formMsg.type === "password" && formMsg.text && (
                        <p className="text-red-600 mt-1">{formMsg.text}</p>
                      )}
                    </form>
                  </>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

export default App;
