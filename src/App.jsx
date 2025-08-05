import { useState, useRef } from "react";
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

import { TimerIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";
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
    return `
      ${minutes > 0 ? `${minutes}m` : ""}${
      minutesExist ? ` ${formatNumber(seconds)}` : formatNumber(seconds)
    }${legible ? `.${formatNumber(hundredths)}s` : ""}
    `;
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

function App() {
  const congratsRef = useRef(null);
  const passwordRef = useRef("");
  const nameRef = useRef("");
  const intervalRef = useRef(null);
  const [timer, setTimer] = useState(0);
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
  const [gameCompleted, setGameCompleted] = useState(false);
  const [submitting, setSubmitting] = useState({
    text: "Submit",
    loading: false,
    type: "score",
  });

  const finalPuzzleCompleted = puzzleData.index === FINAL_PUZZLE_INDEX;

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

    const inputPassword = passwordRef.current.value.trim();

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
    if (!checkName && puzzleToLoadIndex !== +puzzleData.index + 1) {
      setFormMsg({
        text: "That's not the next puzzle!",
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
    setGameCompleted(false);
    passwordRef.current.value = ""; // Clear the input field
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
      console.log("🚀 ~ handleSubmitScore ~ result:", result);

      if (response.ok) {
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
        }, 1000);
      } else {
        setSubmitting({
          ...submitting,
          text: "Something went wrong!",
          loading: false,
        });

        resetSubmitStatus();
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

  // Stress test Sheets API
  // useEffect(() => {
  //   async function sendConcurrentRequests() {
  //     // The URL for the POST request
  //     const url =
  //       "https://script.google.com/macros/s/AKfycbyuZCyhyANUquk3oWokGCYJYrrjGeOqjIA2FXIKytp5emLaFPhLGhUYd8o3SS8krT7m/exec";

  //     // The headers for the request
  //     const headers = {
  //       "Content-Type": "text/plain",
  //     };

  //     // An array to store all the promises from the fetch calls
  //     const promises = [];

  //     // Use a loop to create 100 fetch requests
  //     for (let i = 0; i < 10; i++) {
  //       // Create some unique data for each request
  //       const data = {
  //         puzzle: i,
  //         name: `test`,
  //         time: `${i}:00:00`,
  //         moves: `${i}`,
  //         sheet: `Sheet1`,
  //       };
  //       // Generate a random delay between 250 and 1000 milliseconds
  //       const delay = Math.floor(Math.random() * (1000 - 250 + 1)) + 250;

  //       // Create a new promise for each request
  //       const requestPromise = new Promise((resolve, reject) => {
  //         // Use setTimeout to schedule the fetch call after the random delay
  //         setTimeout(async () => {
  //           try {
  //             console.log(
  //               `Sending request #${i + 1} after a delay of ${delay}ms...`
  //             );

  //             // The fetch call is now inside the timeout, but the loop has already finished.
  //             // This allows all requests to be scheduled concurrently.
  //             const response = await fetch(url, {
  //               method: "POST",
  //               headers: headers,
  //               body: JSON.stringify(data),
  //             });

  //             if (!response.ok) {
  //               throw new Error(
  //                 `HTTP error! Status: ${response.status} for request #${i + 1}`
  //               );
  //             }

  //             const result = await response.text();
  //             resolve(result); // Resolve the promise with the response body
  //           } catch (error) {
  //             console.error(`Request #${i + 1} failed:`, error);
  //             reject(error); // Reject the promise on failure
  //           }
  //         }, delay);
  //       });

  //       promises.push(requestPromise);
  //     }

  //     // Use Promise.all to wait for all promises to settle
  //     try {
  //       console.log(
  //         "All 100 requests have been scheduled. Waiting for them to complete..."
  //       );
  //       const results = await Promise.all(promises);

  //       console.log("All 100 scheduled requests completed successfully!");

  //       results.forEach((result, index) => {
  //         console.log(`Response from request #${index + 1}:`, result);
  //       });
  //     } catch (error) {
  //       console.error("One or more scheduled requests failed:", error);
  //     }
  //   }

  //   // Call the function to start the process
  //   sendConcurrentRequests();
  // }, []);

  useGSAP(
    () => {
      if (congratsRef.current && finalPuzzleCompleted) {
        let split = SplitText.create(congratsRef.current, {
          type: "chars",
        });

        gsap.from(split.chars, {
          yPercent: "random([-10,10])",
          autoAlpha: 0,
          stagger: {
            each: 0.0375,
          },
        });
      }
    },
    { dependencies: [gameCompleted, finalPuzzleCompleted, congratsRef.current] }
  );

  return (
    <div className="font-display w-screen h-screen bg-gray-100 py-8 px-4 overflow-y-auto">
      <div className="mb-8 w-full">
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
            <div className="flex gap-2 items-center h-[32px] justify-between">
              <div className="flex h-full gap-2 mb-2">
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
      <Modal isOpen={gameCompleted} finalPuzzleCompleted>
        {finalPuzzleCompleted ? (
          <div>
            <h2
              ref={congratsRef}
              className="text-center text-2xl font-bold mb-1"
            >
              Congratulations!
            </h2>
            <p className="mb-4 text-center">
              You've now finished all of our puzzles! This marks the end of our
              event at Lollapuzzoola 18. We hope you had a good time playing!
            </p>
            <div className="p-4 flex bg-primary-100 gap-4 rounded-md">
              <img width="75" src={AlignLogo} />
              <p>
                If you're interested in playing more Align puzzles, you can
                access the game and its archive{" "}
                <a
                  className="text-primary-600 shadow-[0_1px_0_var(--orange)]"
                  href="https://www.bostonglobe.com/games/align/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  on our website
                </a>{" "}
                or in the Globe mobile app.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-8">
              <div className="text-center bg-primary-100 py-2 px-4 rounded-md">
                <h3 className="text-lg mb-1">Time</h3>
                <p className="text-4xl text-primary-600 font-bold">
                  {formatTime({ ms: timer, legible: true })}
                </p>
              </div>
              <div className="text-center bg-primary-100 py-2 px-4 rounded-md">
                <h3 className="text-lg mb-1">Moves</h3>
                <p className="text-4xl text-primary-600 font-bold">
                  {puzzleData.moves}
                </p>
              </div>
            </div>
            <div className="text-center">
              {submitting.type === "score" && (
                <>
                  <h2 className="text-2xl font-bold mb-1">Nice work!</h2>
                  <p>Submit your score by pressing the button below.</p>
                  <button
                    disabled={submitting.loading}
                    onClick={handleSubmitScore}
                    className={clsx(
                      `mt-4 cursor-pointer w-full p-4 rounded hover:bg-primary-600/90 transition-colors`,
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
                    Enter the password for the next puzzle below.
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
    </div>
  );
}

export default App;
