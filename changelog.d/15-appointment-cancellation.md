Phase W2: appointment cancellation with policy-aware messaging
([issue #15](https://github.com/DocForum/docforum-web/issues/15)). The
cancellation dialog reads the per-appointment policy from `docforum-core`
instead of hard-coding a cutoff, explains slot release, late-cancellation
recording and the referral consequence before confirming, stays available
after the cutoff, and refreshes the appointment detail and lists on success.
The policy and cancel writes are assumed shapes pending docforum-core#56.
