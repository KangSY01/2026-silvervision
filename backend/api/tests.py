from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    ActivityLog,
    CameraAccessGrant,
    EmergencyEvent,
    EmergencyNotification,
    Exercise,
    ExerciseMission,
    ExerciseSession,
    Guardian,
    GuardianSeniorMap,
    PhysicalAbilityLog,
    PoseFeedback,
    RankingSnapshot,
    Senior,
)


def _access_token(role, user_id):
    """views._issue_tokens와 동일한 방식으로 role/user_id 클레임을 심는다."""
    refresh = RefreshToken()
    refresh['role'] = role
    refresh['user_id'] = user_id
    return str(refresh.access_token)


class ApiTestBase(APITestCase):
    def make_senior(self, login_id, barcode_code, name='시니어', address='서울시'):
        senior = Senior(
            login_id=login_id, name=name, phone='01000000000',
            address=address, mobility_level=Senior.MobilityLevel.INDEPENDENT,
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


class GamificationTests(ApiTestBase):
    def setUp(self):
        self.exercise = self.make_exercise()
        self.senior = self.make_senior('senior1', 'BARCODE-1', name='갑', address='서울시')
        self.same_region = self.make_senior(
            'senior2', 'BARCODE-2', name='을', address='서울시',
        )
        self.other_region = self.make_senior(
            'senior3', 'BARCODE-3', name='병', address='부산시',
        )

    def _complete_session(self, senior, completion_rate='80.00'):
        """세션을 만들고 PATCH로 완료 처리한다 (실제 API 흐름)."""
        session = self.make_session(senior, self.exercise)
        self.auth('senior', senior.senior_id)
        url = (
            f'/api/v1/senior/{senior.senior_id}'
            f'/sessions/{session.session_id}/'
        )
        res = self.client.patch(
            url, {'completion_rate': completion_rate}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return session

    def _ranking(self, senior):
        self.auth('senior', senior.senior_id)
        res = self.client.get(f'/api/v1/senior/{senior.senior_id}/ranking/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data

    def test_completing_session_increments_fruit_count(self):
        self._complete_session(self.senior)
        self.senior.refresh_from_db()
        self.assertEqual(self.senior.fruit_count, 1)

    def test_fruit_count_respects_daily_cap(self):
        for _ in range(8):
            self._complete_session(self.senior)
        self.senior.refresh_from_db()
        self.assertEqual(self.senior.fruit_count, 6)

    def test_repeated_patch_does_not_double_award(self):
        session = self._complete_session(self.senior)
        url = (
            f'/api/v1/senior/{self.senior.senior_id}'
            f'/sessions/{session.session_id}/'
        )
        self.client.patch(url, {'completion_rate': '90.00'}, format='json')
        self.senior.refresh_from_db()
        self.assertEqual(self.senior.fruit_count, 1)

    def test_setting_only_accuracy_does_not_award_or_rank(self):
        session = self.make_session(self.senior, self.exercise)
        self.auth('senior', self.senior.senior_id)
        url = (
            f'/api/v1/senior/{self.senior.senior_id}'
            f'/sessions/{session.session_id}/'
        )
        res = self.client.patch(
            url, {'accuracy_avg': '70.00'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.senior.refresh_from_db()
        self.assertEqual(self.senior.fruit_count, 0)
        self.assertFalse(
            RankingSnapshot.objects.filter(senior=self.senior).exists()
        )

    def test_ranking_snapshot_created_on_completion(self):
        self._complete_session(self.senior)
        data = self._ranking(self.senior)
        self.assertIsNotNone(data['national'])
        self.assertIsNotNone(data['regional'])
        self.assertEqual(data['national']['score'], 1)
        self.assertEqual(data['national']['rank_position'], 1)
        self.assertEqual(data['regional']['rank_scope'], 'regional')

    def test_rank_position_reflects_relative_scores(self):
        self._complete_session(self.senior)
        self._complete_session(self.senior)
        self._complete_session(self.same_region)

        top = self._ranking(self.senior)
        self.assertEqual(top['national']['score'], 2)
        self.assertEqual(top['national']['rank_position'], 1)

        second = self._ranking(self.same_region)
        self.assertEqual(second['national']['score'], 1)
        self.assertEqual(second['national']['rank_position'], 2)

    def test_regional_ranking_grouped_by_address(self):
        self._complete_session(self.senior)
        self._complete_session(self.senior)
        self._complete_session(self.other_region)

        seoul = self._ranking(self.senior)
        busan = self._ranking(self.other_region)

        # 전국은 점수순(서울 2점 1위, 부산 1점 2위)
        self.assertEqual(seoul['national']['rank_position'], 1)
        self.assertEqual(busan['national']['rank_position'], 2)
        # 지역은 각자 자기 주소 그룹에서 1위
        self.assertEqual(seoul['regional']['rank_position'], 1)
        self.assertEqual(busan['regional']['rank_position'], 1)

    def test_regional_grouping_uses_sido_gugun_prefix(self):
        # 상세주소(도로명/동)가 달라도 "시/도 + 구/군" 접두어가 같으면 한 그룹
        gangnam_a = self.make_senior(
            's-gn-a', 'BC-GN-A', address='서울특별시 강남구 테헤란로 123',
        )
        gangnam_b = self.make_senior(
            's-gn-b', 'BC-GN-B', address='서울특별시 강남구 역삼동 45',
        )
        seocho = self.make_senior(
            's-sc', 'BC-SC', address='서울특별시 서초구 서초대로 1',
        )
        self._complete_session(gangnam_a)
        self._complete_session(gangnam_a)
        self._complete_session(gangnam_b)
        self._complete_session(seocho)

        a = self._ranking(gangnam_a)
        b = self._ranking(gangnam_b)
        c = self._ranking(seocho)

        # 강남구 그룹: A(2점) 1위, B(1점) 2위
        self.assertEqual(a['regional']['rank_position'], 1)
        self.assertEqual(b['regional']['rank_position'], 2)
        # 서초구 그룹: C 단독 1위
        self.assertEqual(c['regional']['rank_position'], 1)

    def test_new_senior_ranking_returns_nulls(self):
        data = self._ranking(self.senior)
        self.assertIsNone(data['national'])
        self.assertIsNone(data['regional'])

    def test_other_senior_ranking_forbidden(self):
        self._complete_session(self.senior)
        self.auth('senior', self.same_region.senior_id)
        res = self.client.get(
            f'/api/v1/senior/{self.senior.senior_id}/ranking/'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_ranking_requires_auth(self):
        self.logout()
        res = self.client.get(
            f'/api/v1/senior/{self.senior.senior_id}/ranking/'
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ActivityLogTests(ApiTestBase):
    def setUp(self):
        self.senior = self.make_senior('senior1', 'BARCODE-1')
        self.other = self.make_senior('senior2', 'BARCODE-2')
        self.url = f'/api/v1/senior/{self.senior.senior_id}/activity-log/'

    def _backdate(self, log, **delta):
        ActivityLog.objects.filter(pk=log.pk).update(
            logged_at=timezone.now() - timedelta(**delta)
        )

    def test_post_single_saves(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url, {'activity_type': 'screen_on'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        log = ActivityLog.objects.get()
        self.assertEqual(log.activity_type, 'screen_on')
        self.assertEqual(log.senior_id, self.senior.senior_id)
        self.assertIsNotNone(log.logged_at)

    def test_post_bulk_saves_all(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url,
            [
                {'activity_type': 'screen_on'},
                {'activity_type': 'touch'},
                {'activity_type': 'accelerometer'},
            ],
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ActivityLog.objects.filter(senior=self.senior).count(), 3)

    def test_post_ignores_body_senior_and_logged_at(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url,
            {
                'activity_type': 'touch',
                'senior': self.other.senior_id,
                'logged_at': '2000-01-01T00:00:00Z',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        log = ActivityLog.objects.get()
        self.assertEqual(log.senior_id, self.senior.senior_id)
        self.assertGreater(log.logged_at.year, 2000)

    def test_blank_activity_type_rejected(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url, {'activity_type': ''}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_returns_own_logs_newest_first(self):
        old = ActivityLog.objects.create(
            senior=self.senior, activity_type='screen_off',
        )
        self._backdate(old, hours=2)
        ActivityLog.objects.create(senior=self.senior, activity_type='screen_on')
        ActivityLog.objects.create(
            senior=self.other, activity_type='touch',
        )

        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        self.assertEqual(res.data[0]['activity_type'], 'screen_on')
        self.assertEqual(res.data[1]['activity_type'], 'screen_off')

    def test_get_limit_param_caps_results(self):
        for _ in range(5):
            ActivityLog.objects.create(
                senior=self.senior, activity_type='touch',
            )
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url, {'limit': 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_get_since_param_filters_by_time(self):
        recent = ActivityLog.objects.create(
            senior=self.senior, activity_type='touch',
        )
        self._backdate(recent, minutes=10)
        old = ActivityLog.objects.create(
            senior=self.senior, activity_type='screen_off',
        )
        self._backdate(old, hours=3)

        since = (timezone.now() - timedelta(hours=1)).isoformat()
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url, {'since': since})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['activity_type'], 'touch')

    def test_get_invalid_limit_returns_400(self):
        self.auth('senior', self.senior.senior_id)
        self.assertEqual(
            self.client.get(self.url, {'limit': 'abc'}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.get(self.url, {'limit': 0}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_get_invalid_since_returns_400(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url, {'since': 'not-a-date'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_senior_forbidden(self):
        self.auth('senior', self.other.senior_id)
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                self.url, {'activity_type': 'touch'}, format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_requires_auth(self):
        self.logout()
        self.assertEqual(
            self.client.get(self.url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class PhysicalAbilityLogTests(ApiTestBase):
    def setUp(self):
        self.senior = self.make_senior('senior1', 'BARCODE-1')
        self.other = self.make_senior('senior2', 'BARCODE-2')
        self.url = f'/api/v1/senior/{self.senior.senior_id}/ability-log/'

    def test_post_creates_log_defaulting_to_today(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url,
            {'rom_score': '70.00', 'completion_score': '80.00'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        log = PhysicalAbilityLog.objects.get()
        self.assertEqual(log.senior_id, self.senior.senior_id)
        self.assertEqual(log.logged_date, timezone.localdate())

    def test_same_day_post_upserts_instead_of_conflict(self):
        self.auth('senior', self.senior.senior_id)
        first = self.client.post(
            self.url,
            {
                'rom_score': '70.00', 'completion_score': '80.00',
                'logged_date': '2026-09-01',
            },
            format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            self.url,
            {
                'rom_score': '75.50', 'completion_score': '82.00',
                'logged_date': '2026-09-01',
            },
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(
            PhysicalAbilityLog.objects.filter(senior=self.senior).count(), 1
        )
        log = PhysicalAbilityLog.objects.get(senior=self.senior)
        self.assertEqual(str(log.rom_score), '75.50')
        self.assertEqual(str(log.completion_score), '82.00')

    def test_get_returns_own_logs_ascending_by_date(self):
        PhysicalAbilityLog.objects.create(
            senior=self.senior, rom_score='60.00', completion_score='60.00',
            logged_date=date(2026, 8, 10),
        )
        PhysicalAbilityLog.objects.create(
            senior=self.senior, rom_score='65.00', completion_score='65.00',
            logged_date=date(2026, 8, 1),
        )
        PhysicalAbilityLog.objects.create(
            senior=self.other, rom_score='99.00', completion_score='99.00',
            logged_date=date(2026, 8, 5),
        )
        self.auth('senior', self.senior.senior_id)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [row['logged_date'] for row in res.data],
            ['2026-08-01', '2026-08-10'],
        )

    def test_post_ignores_body_senior(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url,
            {
                'rom_score': '70.00', 'completion_score': '80.00',
                'senior': self.other.senior_id,
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            PhysicalAbilityLog.objects.get().senior_id, self.senior.senior_id
        )

    def test_negative_score_rejected(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url,
            {'rom_score': '-1.00', 'completion_score': '80.00'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_score_rejected(self):
        self.auth('senior', self.senior.senior_id)
        res = self.client.post(
            self.url, {'rom_score': '70.00'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_senior_forbidden(self):
        self.auth('senior', self.other.senior_id)
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                self.url,
                {'rom_score': '70.00', 'completion_score': '80.00'},
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_requires_auth(self):
        self.logout()
        self.assertEqual(
            self.client.get(self.url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class TokenRefreshLogoutTests(ApiTestBase):
    """토큰 refresh(재발급) + 로그아웃(refresh token blacklist)."""

    def setUp(self):
        self.senior = self.make_senior('s1', 'BC1')
        self.refresh_url = '/api/v1/auth/token/refresh/'
        self.logout_url = '/api/v1/auth/logout/'

    def _login(self):
        res = self.client.post(
            '/api/v1/auth/senior/login/',
            {'login_id': 's1', 'password': 'abcd1234'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data

    def test_refresh_issues_access_with_role_claims(self):
        tokens = self._login()
        res = self.client.post(
            self.refresh_url, {'refresh': tokens['refresh']}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # 새 access token으로 본인 리소스에 접근되면 role/user_id 클레임이
        # 정상 복사된 것이다.
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}'
        )
        detail = self.client.get(f'/api/v1/senior/{self.senior.senior_id}/')
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_refresh_missing_field_is_400(self):
        res = self.client.post(self.refresh_url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_invalid_token_is_401_with_detail(self):
        res = self.client.post(
            self.refresh_url, {'refresh': 'not-a-real-token'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', res.data)

    def test_logout_blacklists_refresh_token(self):
        tokens = self._login()
        res = self.client.post(
            self.logout_url, {'refresh': tokens['refresh']}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_205_RESET_CONTENT)
        # 로그아웃한 refresh token으로는 더 이상 재발급되지 않는다.
        again = self.client.post(
            self.refresh_url, {'refresh': tokens['refresh']}, format='json',
        )
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_missing_field_is_400(self):
        res = self.client.post(self.logout_url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_is_idempotent_for_invalid_token(self):
        res = self.client.post(
            self.logout_url, {'refresh': 'garbage'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_205_RESET_CONTENT)
