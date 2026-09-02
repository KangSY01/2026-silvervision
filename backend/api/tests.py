from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    CameraAccessGrant,
    EmergencyEvent,
    EmergencyNotification,
    Exercise,
    ExerciseMission,
    ExerciseSession,
    Guardian,
    GuardianSeniorMap,
    PoseFeedback,
    Senior,
)


def _access_token(role, user_id):
    """views._issue_tokens와 동일한 방식으로 role/user_id 클레임을 심는다."""
    refresh = RefreshToken()
    refresh['role'] = role
    refresh['user_id'] = user_id
    return str(refresh.access_token)


class ApiTestBase(APITestCase):
    def make_senior(self, login_id, barcode_code, name='시니어'):
        senior = Senior(
            login_id=login_id, name=name, phone='01000000000',
            address='서울시', mobility_level=Senior.MobilityLevel.INDEPENDENT,
            barcode_code=barcode_code,
        )
        senior.set_password('abcd1234')
        senior.save()
        return senior

    def make_guardian(self, login_id, name='보호자'):
        guardian = Guardian(
            login_id=login_id, name=name, phone='01011111111',
            address='서울시',
        )
        guardian.set_password('abcd1234')
        guardian.save()
        return guardian

    def make_exercise(self):
        return Exercise.objects.create(
            name='스트레칭', category='유연성',
            difficulty=Exercise.Difficulty.EASY,
            guide_image_url='http://x/g.png',
            silhouette_url='http://x/s.png', reference_angles={},
        )

    def make_session(self, senior, exercise):
        mission = ExerciseMission.objects.create(
            senior=senior, exercise=exercise, scheduled_at=timezone.now(),
        )
        return ExerciseSession.objects.create(
            senior=senior, mission=mission, exercise=exercise,
        )

    def auth(self, role, user_id):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {_access_token(role, user_id)}'
        )

    def logout(self):
        self.client.credentials()


class GuardianSeniorMapTests(ApiTestBase):
    def setUp(self):
        self.guardian = self.make_guardian('g1')
        self.other_guardian = self.make_guardian('g2')
        self.senior = self.make_senior('senior1', 'BARCODE-1')
        self.url = f'/api/v1/guardian/{self.guardian.guardian_id}/seniors/'

    def test_register_by_login_id(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url, {'registered_via': 'id_search', 'login_id': 'senior1'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['registered_via'], 'id_search')
        self.assertEqual(res.data['senior']['senior_id'], self.senior.senior_id)
        self.assertNotIn('diseases', res.data['senior'])
        self.assertTrue(
            GuardianSeniorMap.objects.filter(
                guardian=self.guardian, senior=self.senior
            ).exists()
        )

    def test_register_by_barcode_resolves_server_side(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url,
            {'registered_via': 'barcode', 'barcode_code': 'BARCODE-1'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['registered_via'], 'barcode')
        self.assertEqual(res.data['senior']['senior_id'], self.senior.senior_id)

    def test_registered_senior_appears_in_list(self):
        GuardianSeniorMap.objects.create(
            guardian=self.guardian, senior=self.senior,
            registered_via='id_search',
        )
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['senior']['name'], self.senior.name)

    def test_duplicate_registration_returns_409(self):
        GuardianSeniorMap.objects.create(
            guardian=self.guardian, senior=self.senior,
            registered_via='id_search',
        )
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url, {'registered_via': 'id_search', 'login_id': 'senior1'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_unknown_login_id_returns_404(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url, {'registered_via': 'id_search', 'login_id': 'nope'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_barcode_returns_404(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url, {'registered_via': 'barcode', 'barcode_code': 'NOPE'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_identifier_returns_400(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.post(
            self.url, {'registered_via': 'id_search'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unlink_removes_mapping(self):
        GuardianSeniorMap.objects.create(
            guardian=self.guardian, senior=self.senior,
            registered_via='barcode',
        )
        self.auth('guardian', self.guardian.guardian_id)
        detail_url = f'{self.url}{self.senior.senior_id}/'
        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            GuardianSeniorMap.objects.filter(
                guardian=self.guardian, senior=self.senior
            ).exists()
        )
        list_res = self.client.get(self.url)
        self.assertEqual(len(list_res.data), 0)

    def test_unlink_unknown_returns_404(self):
        self.auth('guardian', self.guardian.guardian_id)
        res = self.client.delete(f'{self.url}{self.senior.senior_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_guardian_cannot_read_list(self):
        self.auth('guardian', self.other_guardian.guardian_id)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_senior_token_forbidden(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        self.logout()
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ExerciseSessionReadTests(ApiTestBase):
    def setUp(self):
        self.exercise = self.make_exercise()
        self.senior = self.make_senior('senior1', 'BARCODE-1')
        self.other_senior = self.make_senior('senior2', 'BARCODE-2')
        self.session = self.make_session(self.senior, self.exercise)
        self.other_session = self.make_session(self.other_senior, self.exercise)
        PoseFeedback.objects.create(
            session=self.session, joint_name='left_knee', deviation='3.50',
        )
        PoseFeedback.objects.create(
            session=self.session, joint_name='right_knee', deviation='1.20',
        )
        self.list_url = f'/api/v1/senior/{self.senior.senior_id}/sessions/'
        self.detail_url = f'{self.list_url}{self.session.session_id}/'

    def test_list_returns_only_own_sessions(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['session_id'], self.session.session_id)

    def test_list_has_no_nested_feedback(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.list_url)
        self.assertNotIn('pose_feedbacks', res.data[0])

    def test_detail_includes_nested_pose_feedbacks(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['pose_feedbacks']), 2)

    def test_detail_other_seniors_session_id_returns_404(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(
            f'{self.list_url}{self.other_session.session_id}/'
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_wrong_owner_returns_403(self):
        self.auth('senior', self.other_senior.senior_id)
        res = self.client.get(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_start_still_works(self):
        mission = ExerciseMission.objects.create(
            senior=self.senior, exercise=self.exercise,
            scheduled_at=timezone.now(),
        )
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.list_url, {'mission': mission.mission_id}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


class EmergencyEventReadTests(ApiTestBase):
    def setUp(self):
        self.senior = self.make_senior('senior1', 'BARCODE-1')
        self.mapped_guardian = self.make_guardian('g1')
        self.unmapped_guardian = self.make_guardian('g2')
        GuardianSeniorMap.objects.create(
            guardian=self.mapped_guardian, senior=self.senior,
            registered_via='id_search',
        )
        self.event = EmergencyEvent.objects.create(
            senior=self.senior, event_type=EmergencyEvent.EventType.FALL,
            detection_source='vision',
        )
        EmergencyNotification.objects.create(
            event=self.event, guardian=self.mapped_guardian,
        )
        CameraAccessGrant.objects.create(
            event=self.event,
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.list_url = '/api/v1/emergency/'
        self.detail_url = f'/api/v1/emergency/{self.event.event_id}/'

    def test_senior_sees_own_event(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_mapped_guardian_sees_event(self):
        self.auth('guardian', self.mapped_guardian.guardian_id)
        res = self.client.get(self.list_url)
        self.assertEqual(len(res.data), 1)

    def test_unmapped_guardian_does_not_see_event(self):
        self.auth('guardian', self.unmapped_guardian.guardian_id)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_detail_includes_notifications_and_camera_grants(self):
        self.auth('guardian', self.mapped_guardian.guardian_id)
        res = self.client.get(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['notifications']), 1)
        self.assertEqual(len(res.data['camera_grants']), 1)

    def test_unmapped_guardian_detail_returns_404(self):
        self.auth('guardian', self.unmapped_guardian.guardian_id)
        res = self.client.get(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_guardian_cannot_create_event(self):
        self.auth('guardian', self.mapped_guardian.guardian_id)
        res = self.client.post(
            self.list_url,
            {'event_type': 'fall', 'detection_source': 'vision'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_senior_can_create_event(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.list_url,
            {'event_type': 'inactivity', 'detection_source': 'sensor'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
