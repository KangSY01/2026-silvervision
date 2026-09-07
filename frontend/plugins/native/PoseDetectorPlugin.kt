package com.anonymous.VideoTensor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.media.Image
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import com.mrousavy.camera.core.types.Orientation
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.concurrent.atomic.AtomicReference

class PoseDetectorPlugin(
    proxy: VisionCameraProxy,
    @Suppress("UNUSED_PARAMETER") options: Map<String, Any>?
) : FrameProcessorPlugin() {

    companion object {
        private const val TAG = "PoseDetectorPlugin"
        // 학습(tfliteProject)이 Lite 등급으로 좌표를 뽑았으므로 앱도 Lite로 맞춘다.
        // Full/Lite는 좌표 분포가 미묘하게 달라 CNN 입력이 학습과 어긋날 수 있다.
        private const val MODEL_FILE = "pose_landmarker_lite.task"
    }

    private var poseLandmarker: PoseLandmarker? = null
    private val context: Context = proxy.context

    // MediaPipe에 넣은 upright 이미지의 실효 크기. JS의 aspect_correct(x*(W/H))에 쓰인다.
    // 카메라 포맷을 3:4로 고정하므로 사실상 상수(대개 W/H≈0.75).
    private var lastWidth: Int = 0
    private var lastHeight: Int = 0

    // MediaPipe가 처리를 끝낸 가장 최신 결과를 여기에 저장.
    // 비동기 콜백(MediaPipe 스레드)에서 set, frame processor(다른 스레드)에서 get
    // 하므로 AtomicReference로 스레드 안전 보장.
    private val latestResult = AtomicReference<Map<String, Any>?>(null)

    // MediaPipe LIVE_STREAM은 단조 증가 timestamp(ms)를 요구함.
    private var lastTimestampMs: Long = 0L

    init {
        setupLandmarker()
    }

    private fun setupLandmarker() {
        try {
            poseLandmarker = createLandmarker(Delegate.GPU)
            Log.i(TAG, "PoseLandmarker initialized with GPU")
        } catch (e: Exception) {
            Log.w(TAG, "GPU failed, trying CPU: ${e.message}")
            try {
                poseLandmarker = createLandmarker(Delegate.CPU)
                Log.i(TAG, "PoseLandmarker initialized with CPU")
            } catch (e2: Exception) {
                Log.e(TAG, "PoseLandmarker init failed: ${e2.message}")
            }
        }
    }

    private fun createLandmarker(delegate: Delegate): PoseLandmarker {
        val baseOptions = BaseOptions.builder()
            .setModelAssetPath(MODEL_FILE)
            .setDelegate(delegate)
            .build()

        val options = PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.LIVE_STREAM)            // 👈 IMAGE에서 변경
            .setNumPoses(1)
            .setMinPoseDetectionConfidence(0.5f)
            .setMinPosePresenceConfidence(0.5f)
            .setMinTrackingConfidence(0.5f)
            .setResultListener { result, _ -> onResult(result) } // 👈 비동기 결과 콜백
            .setErrorListener { error ->
                Log.e(TAG, "MediaPipe error: ${error.message}")
            }
            .build()

        return PoseLandmarker.createFromOptions(context, options)
    }

    // MediaPipe가 한 프레임 처리를 끝내면 자기 내부 스레드에서 호출됨.
    private fun onResult(result: PoseLandmarkerResult) {
        val landmarks = result.landmarks().firstOrNull()?.map { lm ->
            mapOf(
                "x" to lm.x().toDouble(),
                "y" to lm.y().toDouble(),
                "z" to lm.z().toDouble(),
                "visibility" to (if (lm.visibility().isPresent) lm.visibility().get().toDouble() else 0.0),
                "presence" to (if (lm.presence().isPresent) lm.presence().get().toDouble() else 0.0)
            )
        } ?: emptyList()
        // world landmarks: 엉덩이 중심(미터 단위) 3D 좌표. 이미지 좌표계가 아니므로
        // upright 회전 보정과 무관 — 운동(exercise) 포즈 매칭에 사용(카메라 거리 불변).
        val worldLandmarks = result.worldLandmarks().firstOrNull()?.map { lm ->
            mapOf(
                "x" to lm.x().toDouble(),
                "y" to lm.y().toDouble(),
                "z" to lm.z().toDouble(),
                "visibility" to (if (lm.visibility().isPresent) lm.visibility().get().toDouble() else 0.0),
                "presence" to (if (lm.presence().isPresent) lm.presence().get().toDouble() else 0.0)
            )
        } ?: emptyList()
        // timestampMs: 좌표가 실제로 '찍힌' 시각. JS의 중복필터 키 + 100ms 격자 원점에 사용.
        // (Date.now()는 결과를 '받아본' 시각이라 처리 지연만큼 어긋난다.)
        latestResult.set(
            mapOf(
                "landmarks" to landmarks,
                "worldLandmarks" to worldLandmarks,
                "timestampMs" to result.timestampMs().toDouble()
            )
        )
    }

    // 카메라 버퍼를 화면과 같은 방향(upright)으로 세우기 위한 시계방향 회전각.
    // vision-camera Frame.orientation은 CameraX imageInfo.rotationDegrees(R)를 Orientation으로
    // 감싸고 reversed()한 값이라, 역산해 R(0/90/180/270)을 복원한다.
    // 앱이 세로 고정이라 실제로는 상수(대개 90).
    private fun uprightRotationDegrees(frame: Frame): Int =
        when (frame.orientation) {
            Orientation.PORTRAIT -> 0
            Orientation.LANDSCAPE_RIGHT -> 90
            Orientation.PORTRAIT_UPSIDE_DOWN -> 180
            Orientation.LANDSCAPE_LEFT -> 270
        }

    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        val landmarker = poseLandmarker ?: return null

        try {
            val bitmap = imageToBitmap(frame.image) ?: return null

            // 센서 버퍼(가로)를 upright로 "픽셀 자체를" 회전해서 넣는다(B안).
            // setRotationDegrees(A안)는 출력 좌표를 안 돌려주므로, 넘기는 이미지를 직접 세워야
            // MediaPipe가 화면과 정렬된 정규화 좌표를 반환한다. → JS 축 스왑 불필요.
            val rotation = uprightRotationDegrees(frame)
            val upright = if (rotation == 0) {
                bitmap
            } else {
                val m = Matrix().apply { postRotate(rotation.toFloat()) }
                val rotated =
                    Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
                bitmap.recycle()
                rotated
            }
            // JS aspect_correct용 실효 W/H 기록 (recycle 전에 읽어둔다).
            lastWidth = upright.width
            lastHeight = upright.height
            val mpImage = BitmapImageBuilder(upright).build()

            // ns → ms 변환. 같은 ms가 두 번 들어오면 에러나므로 단조 증가 보장.
            val timestampMs = (frame.timestamp / 1_000_000).coerceAtLeast(lastTimestampMs + 1)
            lastTimestampMs = timestampMs

            // 👇 핵심: 비동기. 즉시 리턴됨. 블로킹 없음.
            // MediaPipe가 자기 스레드 풀에서 처리하고, 따라잡지 못하는 프레임은 자동 drop.
            landmarker.detectAsync(mpImage, timestampMs)

            upright.recycle()
        } catch (e: Exception) {
            Log.e(TAG, "detectAsync failed: ${e.message}")
        }

        // MediaPipe가 콜백으로 채워둔 최신 결과를 JS로 반환.
        // 새 결과가 아직 없으면 null (JS 쪽은 기존 점 위치 유지).
        // 실효 W/H를 덧붙여 JS가 종횡비 보정에 쓰도록 한다.
        val result = latestResult.getAndSet(null) ?: return null
        return result + mapOf(
            "width" to lastWidth.toDouble(),
            "height" to lastHeight.toDouble()
        )
    }

    private fun imageToBitmap(image: Image): Bitmap? {
        return try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * image.width

            val bitmap = Bitmap.createBitmap(
                image.width + rowPadding / pixelStride,
                image.height,
                Bitmap.Config.ARGB_8888
            )
            buffer.rewind()
            bitmap.copyPixelsFromBuffer(buffer)

            if (rowPadding == 0) {
                bitmap
            } else {
                val cropped = Bitmap.createBitmap(bitmap, 0, 0, image.width, image.height)
                bitmap.recycle()
                cropped
            }
        } catch (e: Exception) {
            Log.e(TAG, "imageToBitmap failed: ${e.message}")
            null
        }
    }
}