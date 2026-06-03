from django.db import transaction
from django.utils import timezone

from .models import IssueAuctions, Issues


def get_top_bid(auction):
    return auction.bids.select_related('bidder').order_by('-bid_amount', '-created_at').first()


def complete_auction(auction_id, updated_by=None):
    with transaction.atomic():
        auction = IssueAuctions.objects.select_for_update().select_related('issue').get(pk=auction_id)

        if auction.status == 'Completed':
            return auction, False
        if auction.status == 'Cancelled':
            return auction, False

        top_bid = get_top_bid(auction)
        winner = top_bid.bidder if top_bid else None
        audit_user = updated_by or auction.updated_by or auction.created_by

        auction.status = 'Completed'
        auction.winner = winner
        auction.updated_by = audit_user
        auction.save(update_fields=['status', 'winner', 'updated_at', 'updated_by'])

        issue = Issues.objects.select_for_update().get(pk=auction.issue_id)
        issue.assigned_to = winner
        issue.updated_by = audit_user
        issue.save(update_fields=['assigned_to', 'updated_at', 'updated_by'])

        return auction, True


def complete_expired_auctions(now=None):
    now = now or timezone.now()
    auction_ids = list(
        IssueAuctions.objects.filter(status='In Progress', end_date__lte=now)
        .order_by('end_date')
        .values_list('pk', flat=True)
    )

    completed = 0
    for auction_id in auction_ids:
        _, was_completed = complete_auction(auction_id)
        if was_completed:
            completed += 1

    return completed
