# Pitchy Voice Exercise Investigation

## Purpose

Track `pitchy` as a post-MVP investigation candidate for voice-aware exercise objects.

This is not an MVP dependency decision.
The current MVP should continue without microphone-based exercises.

## Why It Is Interesting

`pitchy` is a small JavaScript pitch-detection library intended for real-time use cases such as tuners.
It returns:

- detected pitch in Hz
- a clarity value from `0` to `1`

That output shape fits early singing and ear-training exercises well because the app can reject unclear frames before scoring a user response.

## Likely Post-MVP Uses

- sing a target note
- sing back a short pattern
- match an interval
- hold a pitch steadily
- show cents sharp/flat from the target
- track vocal range over time
- support call-and-response practice objects

## Frequency Range

The current `pitchy` package documentation does not appear to specify a fixed supported frequency range.

That means the practical range should be treated as an app-level exercise decision and verified by spike testing.
The range will depend on:

- microphone and browser audio quality
- sample rate
- input buffer length
- background noise
- voice type and age
- clarity threshold
- smoothing and note-stability rules

For a first voice-exercise spike, test a conservative sung-voice range before expanding.
A likely minimum useful target is octaves 2 through 6.
Octaves 0 through 7 would be better if microphone quality, buffer settings, and pitch stability allow it, but that should be treated as an aspirational test range rather than a promise.
The app should explicitly reject unstable detections outside the configured exercise range.

## Spike Shape

1. Capture microphone input with Web Audio `getUserMedia`.
2. Feed time-domain audio frames into `pitchy`.
3. Convert detected Hz to nearest equal-tempered note and cents offset.
4. Apply a clarity threshold before accepting a frame.
5. Smooth accepted frames over a short rolling window.
6. Test octaves 2 through 6 as the minimum target range.
7. Test octaves 0 through 7 as an aspirational range and record where detection becomes unreliable.
8. Test with adult low, adult high, and child/student voices if available.
9. Record practical frequency limits, latency, stability, and false octave behavior.
10. Decide whether `pitchy` alone is enough or whether a broader audio-analysis library such as Meyda or Essentia.js is needed.

## Risks

- Voice pitch detection is probabilistic and can jump octaves.
- Browser microphone permissions and device differences affect reliability.
- Noisy rooms may make scoring feel unfair.
- The app must avoid storing or transmitting microphone audio unless the user explicitly opts in.
- Exercises should make clear that feedback is approximate, not a clinical voice assessment.
